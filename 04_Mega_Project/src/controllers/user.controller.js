import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary"
import mongoose from 'mongoose'


const generateAccessAndRefreshToken = async (userId) => {
    try {
        // while created the user the  generateAccessToken and generateRefreshToken method will be inserted automatically from user.model
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken() // accessing from user.model
        const refreshToken = user.generateRefreshToken()


        // user schema k pass refresh token h, usme daal do
        user.refreshToken = refreshToken
        // validateBeforeSave is nothing but for the pass to not be removed
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

    /* Steps for user registration

        1. get user details from frontend
        2. validation — not empty
        3. check if user already exists: username, email
        4. check for images, check for avatar
        5. upload them to cloudinary, avatar
        6. create user object —- create entry in db
        7. remove password and refresh token field from response for security
        8. check for user creation
        9. return res 
    */

    const { username, email, password, fullName } = req.body

    // if ( username === "") throw new ApiError(400, "Username is required"); basic error handling
    if ( // advanced error handling
        [username, email, password, fullName].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = await User.findOne({ // checking if user already exists
        $or: [{ email }, { username }]
    })

    if (existingUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // this req.files is from multer that is passed from user.router
    if (!req.files.avatar || !req.files.avatar[0]) {
        throw new ApiError(400, "Avatar file is required")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path || ""; 

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // upload the local files path to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(500, "Avatar upload failed")
    }

    // Creating User
    const user = await User.create({
        username: username.toLowerCase(),
        email,
        password,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    // removing password and refresh token from DB entry
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {

    /* Steps for login user
        1. req.body -> data
        2. username or email
        3. find the user
        4. password check
        5. access and refresh token
        6. send cookie
    */
    const { username, email, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User not exist")
    }

    // passing the password to isPasswordCorrect method made in user.model
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Your password is not correct")
    }

    // using the generateAccessAndRefreshToken for access values and passing id
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    // creating another user instance for - the previous user don't have the refresh token.//\\
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") // no need password <


    // it means no one can edit cookies from frontend (but backend can)
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options) // with cookie parse the accessToken, options
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In successfully"
            )
        )

})

// for logout thats why we make auth middleware
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: undefined } },
        { new: true } // updated value will be returned
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorize request")
    }

    try {
        // jwt.verify needs 2 things - token and secret key
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken.id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");

        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired");
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { newRefreshToken, accessToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");

    }
})

// change password of current user
const changeCurrentPassword = asyncHandler(async (req, res) => {

    const { oldPassword, newPassword } = req.body; // getting passW from frontend

    console.log(req.user.id) // req.user is getting from middleware

    const user = await User.findById(req.user?._id)

    // the password that is saved in DB is encrypted so we need to pass it through isPasswordCorrect method
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Wrong password");
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Password changed"))
})

// req.user is getting from middleware
const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current User fetched successfully"))
})

// update account details Name and email
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email: email,
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
})

// change avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is missing")
    }
    // avatar name is same as db field name
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    // getting previous image id from user by splitting and taking last element
    const prevImgId = req.user.avatar.split("/").slice(-1)[0].split(".")[0]

    await cloudinary.uploader.destroy(prevImgId) // deleting the previous image

    if (!avatar) {
        throw new ApiError(500, "Something went wrong while uploading avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password")



    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar updated successfully"))
})

// change coverIMage
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverLocalPath = req.file?.path;

    if (!coverLocalPath) {
        throw new ApiError(400, "Cover is missing")
    }
    // coverImage name is same as db field name
    const coverImage = await uploadOnCloudinary(coverLocalPath)

    const prevCoverImgId = req.user.coverImage.split("/").slice(-1)[0].split(".")[0]
    // if the coverImage is not empty then delete the previous one 
    if (prevCoverImgId) {
        await cloudinary.uploader.destroy(prevCoverImgId)
    }

    if (!coverImage) {
        throw new ApiError(500, "Something went wrong while uploading coverImage")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"))
})

// finding channel by username from req.params
const getUserChannelProfile = asyncHandler(async (req, res) => {
    console.log('ok')
    const { username } = req.params;
    console.log(username)

    if (!username?.trim()) {
        throw new ApiError(400, "channel name is missing");
    }

    // aggregate pipeline
    // there will be two thing creates one is i subscribed and other is my subscribers
    const channel = await User.aggregate([
        {
            $match: { // finding channel by username
                username: username?.toLowerCase()
            }
        },
        {   // this field is for how many people are subscribed to this channel
            $lookup: { // lookup joins two collections
                from: "subscriptions",  // from subscriptions model
                localField: "_id",  // find using this field id 
                foreignField: "channel", // joining channel from subscriptions model
                as: "subscribers" // new field name (join as subscribers)
            }
        },
        {
            // this field is for how many people i subscribed  
            $lookup: {
                from: "subscriptions", // model name
                localField: "_id",
                foreignField: "subscriber", // which field to join
                as: "subscribedTo"
            }
        },
        {   // extra fields adding
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers" // $ - because it is a field from lookup
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: { // subscribed or not button 
                    $cond: { // 'condition' it has ( if, then, else )
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // if user is in subscribers list (from lookup)
                        then: true,
                        else: false
                    }
                }
            }
        },
        {   // final result i'll provide to frontend
            $project: {
                fullName: 1, // 1 - true
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                coverImage: 1,
                avatar: 1,
                email: 1,
            }
        }
    ])
    if (!channel?.length) {
        throw new ApiError(404, "Channel not found")
    }
    console.log(channel)

    return res
        .status(200)
        .json(new ApiResponse(200, channel[0], "Channel profile"))
})

// getting watch history of user
const getWatchHistory = asyncHandler(async (req, res) => { 

    const user = await User.aggregate([
        {
            $match: { // finding user by id
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {   // nesting pipeline 1 is for watchHistory, 2 is for video owner
            $lookup: {
                from: "videos",
                localField: "watchHistory", // matching the user watchHistory field with videos _id
                foreignField: "_id", // videos _id
                as: "watchHistory",

                // pushing previous pipeline to this new pipeline
                // we are now on videos pipeline
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner", // videos local field is owner
                            foreignField: "_id",
                            as: "owner",

                            pipeline: [ // passing only necessary fields from owner
                                {
                                    $project: {
                                        fullName: 1,
                                        avatar: 1,
                                        username: 1
                                    }
                                }
                            ]
                        }
                    },
                    // from here the owner field is now active for next pipeline
                    {
                        $addFields: {
                            owner: { // taking the first owner[0] element for easy frontend
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    if (!user?.length) {
        throw new ApiError(404, "User not found")
    } 

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched"
            )
        )
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