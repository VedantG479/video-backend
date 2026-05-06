import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { deleteCloudinaryFile, uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

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
    const conditions = [
        userName ? { userName } : null,
        email ? { email } : null
    ].filter(Boolean); // Removes the nulls

    const existedUser = await User.findOne({
        $or: conditions
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
    
    const conditions = [
        userName ? { userName } : null,
        email ? { email } : null
    ].filter(Boolean); 
    
    const existedUser = await User.findOne({
        $or: conditions
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
        $unset: {
            refreshToken: 1
        }
    }, {
        new: true
    })

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json( new ApiResponse(200, {}, "Logged Out Successfull"))
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    try{
        const {oldPassword, newPassword} = req.body

        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
        if(!isPasswordCorrect)  throw new ApiError(400, 'Invalid old password')

        user.password = newPassword
        await user.save({validateBeforeSave: false})
        
        return res.status(200)
            .json( new ApiResponse(200, {}, 'Password Changed Successfully'))
    }
    catch(error){
        throw new ApiError(400, error?.message || 'error changing password')
    }
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200)
        .json( new ApiResponse(200, req.user, 'current user fetched successfully'))
})  

const updateAccountDetails = asyncHandler(async(req, res) => {
    try{
        const {fullName, email} = req.body
        if(!fullName || !email) throw new ApiError(400, 'all fields are required')

        const user = await User.findByIdAndUpdate(req.user?._id, {
            $set: {
                fullName, 
                email
            }
        }, { new: true}).select('-password -refreshToken')

        return res.status(200)
            .json(new ApiResponse(200, user, 'account details updated successfully'))
    }
    catch(error){
        throw new ApiError(400, error?.message || 'error updating account details')
    }
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    try{
        const avatarLocalPath = req.file?.path
        if(!avatarLocalPath)    throw new ApiError(400, 'avatar file missing')

        const user = await User.findById(req.user?._id)
        const prevAvatarPath = user.avatar

        const avatar = await uploadOnCloudinary(avatarLocalPath)
        if(!avatar.url) throw new ApiError(400, 'error uploading avatar file')

        user.avatar = avatar.url
        await user.save({validateBeforeSave: false})

        await deleteCloudinaryFile(prevAvatarPath)

        return res.status(200)
            .json(new ApiResponse(200, user, 'avatar image updated successfully'))
    }
    catch(error){
        throw new ApiError(400, error?.message || 'error updating avatar')
    }
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    try{
        const coverImageLocalPath = req.file?.path

        const user = await User.findById(req.user?._id)
        const prevCoverImagePath = user.coverImage

        let coverImage
        if(coverImageLocalPath) coverImage = await uploadOnCloudinary(coverImageLocalPath)
        if(coverImage && coverImage.url) throw new ApiError(400, 'error uploading cover image file') 
        
        if(coverImage && coverImage.url)    user.coverImage = coverImage.url
        else    user.coverImage = ''

        await user.save({validateBeforeSave: false})

        if(prevCoverImagePath)  await deleteCloudinaryFile(prevCoverImagePath)

        return res.status(200)
            .json(new ApiResponse(200, user, 'cover image updated successfully'))
    }
    catch(error){
        throw new ApiError(400, error?.message || 'error updating cover image')
    }
})

const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params
    if(!username?.trim())   throw new ApiError(400, 'enter a valid username')
    
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        }, 
        {
            $lookup: {
                from : 'users', 
                localField: '_id', 
                foreignField: 'channel', 
                as: 'subscribers'
            }
        },
        {
            $lookup: {
                from :'users', 
                localField: '_id', 
                foreignField: 'subscriber',
                as: 'subscribedTo'
            }
        }, 
        {
            $addFields: {
                subscibersCount: {
                    $size: '$subscribers'
                }, 
                subscribedToCount: {
                    $size: '$subscribedTo'
                }, 
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, '$subscribers.subscriber']},
                        then: true, 
                        else: false
                    }
                }
            }
        }, 
        {
            $project: {
                username: 1, 
                fullName: 1, 
                avatar: 1, 
                coverImage: 1,
                subscibersCount: 1, 
                subscribedToCount: 1, 
                isSubscribed: 1
            }
        }
    ])
    console.log(channel)

    if(!channel?.length)    throw new ApiError(404, 'error fetching channel')
    return res.status(200)
        .json(new ApiResponse(200, channel[0], 'channel details fetched successfully'))
})

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        }, 
        {
            $lookup: {
                from: 'videos', 
                localField: 'watchHistory', 
                foreignField: '_id',
                as: 'watchHistory', 
                pipeline: [
                    {
                        $lookup: {
                            from: 'users', 
                            localField: 'owner', 
                            foreignField: '_id',
                            as: 'owner',
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    }, 
                    {
                        $addFields: {
                            owner: {
                                $first: '$owner'
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200)
        .json(new ApiResponse(200, user[0].watchHistory, 'watch history fetched successfully'))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
        if(!incomingRefreshToken) throw new ApiError(401, 'unauthorized request')

        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)
        if(!user)   throw new ApiError(401, "Invalid Refresh Token")
        
        if(incomingRefreshToken !== user?.refreshToken) throw new ApiError(401, "Refresh Token is expired or used")
        
        const {accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json( new ApiResponse(200, {accessToken, refreshToken: newRefreshToken}, "Access Token Refreshed"))
    }
    catch(error){
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    getWatchHistory
} 