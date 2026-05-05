import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {jwt} from "jsonwebtoken"

const options = {
    httpOnly: true,
    secure: true
}

const generateAccessAndRefreshToken = async(user) => {
    try{
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    }
    catch(error){
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async(req, res) => {
    // res.status(500).json({
    //     message: 'user registered'
    // })
    //get user details from frontend
    const {fullName, userName, email, password} = req.body

    //validation
    if([fullName, userName, email, password].some((field) => field?.trim() === '')) throw new ApiError(400, "All Fields are required!")

    ///check user already exsists
    const existedUser = await User.findOne({
        $or: [{userName}, {email}]
    })
    if(existedUser) throw new ApiError(400, 'User already exists!')

    //check for images
    const avatarLocalPath = req.files?.avatar[0]?.path
    let coverImageLocalPath 
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) coverImageLocalPath = req.files?.coverImage[0]?.path
    if(!avatarLocalPath)    throw new ApiError(400, 'Avatar Field is required!')

    //upload images
    const avatarImageLink = await uploadOnCloudinary(avatarLocalPath)
    const coverImageLink = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatarImageLink)    throw new ApiError(400, 'Avatar Field is required!')

    //create user object in db
    const user = await User.create({
        fullName, 
        avatar: avatarImageLink.url,
        coverImage: coverImageLink?.url || '',
        username: String(userName).toLowerCase(), 
        email,
        password
    })

    //remove password and refresh token from response - check for user creation
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser)    throw new ApiError(500, 'Error creating User!')

    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, 'User created successfully!')
    )
})

const loginUser = asyncHandler(async(req, res) => {
    const {email, userName, password} = req.body

    if(!(userName || email))    throw new ApiError(400, 'All fields are required!')
    
    const existedUser = await User.findOne({
        $or: [{userName}, {email}]
    })
    if(!existedUser)    throw new ApiError(401, 'User does not exist!')

    const isPasswordValid = await existedUser.isPasswordCorrect(password)
    if(!isPasswordValid)    throw new ApiError(401, 'Invalid User Credentials!')
    
    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(existedUser)
    const loggedInUser = await User.findById(existedUser._id).select("-password -refreshToken")

    return res.status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(  new ApiResponse(200, {user: loggedInUser, accessToken, refreshToken}, 'Logged In Successfull'))
})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    })

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json( new ApiResponse(200, {}, "Logged Out Successfull"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(incomingRefreshToken) throw new ApiError(401, 'unauthorized request')

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if(!user)   throw new ApiError(401, "Invalid Refresh Token")
        
        if(incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh Token is expired or used")
        
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json( new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access Token Refreshed"))
    }
    catch(error){
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export {registerUser, loginUser, logoutUser, refreshAccessToken} 