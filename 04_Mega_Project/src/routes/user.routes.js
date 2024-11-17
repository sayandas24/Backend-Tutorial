import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"


const router = Router()

router.route("/register").post(
    upload.fields(
        {
            name: "avatar", // multer image passing from frontend
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ),
    registerUser
) // calling the registerUser function in controller user.controller


export default router;