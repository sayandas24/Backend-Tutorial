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

const generateAccessAndRefreshToken = async (userId) => {
    try {
        // while created the user the  generateAccessToken and generateRefreshToken method will be inserted automatically from user.model
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken() // accessing from use.model
        const refreshToken = user.generateRefreshToken()


        user.refreshToken = refreshToken // user k pass refresh token h, usme daal do
        await user.save({ validateBeforeSave: false })
        // validateBeforeSave is nothing but for the pass to not be removed

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {

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
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path || ""; 

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }


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

    if (!username || !email) {
        throw new ApiError(400, "Username or email is required")
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
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken") // no need pass <


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
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In successfully"
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

export { registerUser, loginUser, logoutUser }