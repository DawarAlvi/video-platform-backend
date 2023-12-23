import {asyncHandler} from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"

import {ApiResponse} from "../utils/ApiResponse.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"

const registerUser = asyncHandler( async (req, res) => {
    // get details from frontend
    const {fullName, username, email, password} = req.body

    // check for empty fields
    if ([fullName, username, email,password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "all fields are required")
    }

    // check for existing user
    const existingUser = await User.findOne({
        $or:[{username},{email}]
    })
    if (existingUser) {
        throw new ApiError(409, "user with this email or username already exists")
    }

    // get image paths
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    
    // check for files
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required")
    }

    // upload images to cloudinary: avatar, coverImage
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "avatar file is required cloudinary")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "unable to register user")
    }

    // return response
    return res.status(201).json(new ApiResponse(
        200,
        createdUser,
        "user created successfully"
    ))
} )

export {registerUser}