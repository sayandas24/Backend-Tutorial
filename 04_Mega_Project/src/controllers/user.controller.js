import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js'

/* Steps for user registration

    1. get user details from frontend
    2. validation — not empty
    3. check if user already exists: username, email
    4. check for images, check for avatar
    5. upload them to cloudinary, avatar
    6. create user object —- create entry in db
    7. remove password and refresh token field from response
    8. check for user creation
    9. return res 
*/ 

const registerUser = asyncHandler(async (req, res) => {

    const { username, email, password, fullName } = req.body
    console.log(username, email, password, fullName)

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
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    // upload the local files path to cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(500, "Avatar upload failed")
    }

    // Creating User
    const user = await User.create({
        username : username.toLowerCase(),
        email,
        password,
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    })

    // removing password and refresh token
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

export { registerUser }