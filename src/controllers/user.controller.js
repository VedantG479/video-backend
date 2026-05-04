import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.models";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";

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
    const coverImageLocalPath = req.files?.coverImage[0]?.path
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
        username: userName.toLowercase(), 
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

export {registerUser} 