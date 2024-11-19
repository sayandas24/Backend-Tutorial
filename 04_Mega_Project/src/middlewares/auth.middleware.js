import { asyncHandler } from "../utils/asyncHandler"
import { ApiError } from "../utils/ApiError"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model"

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // the cookie is universal, it has all the things that has been passed before
        // accessToken is passed from user.controller 
        const token = req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorize request")
        }

        // verify the token is correct
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

        if (!user) {
            throw new ApiError(401, "Invalid Access Token")
        }

        req.user = user;
        next() // in the next the user will passed, ( in logoutUser )
    } catch (error) {

    }
})  