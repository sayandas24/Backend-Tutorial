import { Router } from "express";
import { registerUser, loginUser, logoutUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar", // multer image passing from frontend
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
) // calling the registerUser function in controller user.controller

router.route("/login").post(loginUser)

// secure route - first run the verifyJWT then next() then run the logoutUser
router.route("/logout").post(verifyJWT, logoutUser)

export default router;