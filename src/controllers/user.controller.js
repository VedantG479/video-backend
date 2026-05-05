import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {registerUser} 