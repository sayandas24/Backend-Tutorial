import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors"

const app = express();

// defining cors (with middleware) with origin (frontend access)
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" })) // middleware to accept limited json data 
app.use(express.urlencoded({ extended: true })) // middleware to accept url encoded data from form or url
app.use(express.static("public")) // send static public files to frontend
app.use(cookieParser()) // middleware to store the user cookie to perform CRUD operations

export { app }