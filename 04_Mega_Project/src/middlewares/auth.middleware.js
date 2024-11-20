import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        // the cookie is universal, it has all the things that has been passed before
        // accessToken is passed from user.controller 
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorize request")
        }

        // verify the token is correct
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        // finding user based upon decodedToken.id
        const user = await User.findById(decodedToken?.id).select("-password -refreshToken") 

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user;
        next() // in the next the user will passed, ( in logoutUser )

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})  