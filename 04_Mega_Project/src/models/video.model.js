import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // for advanced mongoDB queries

const videoSchema = new Schema(
    {
        videoFile: {
            type: String,
            required: true
        },
        thumbnail: {
            type: String,
            required: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        }, 
        duration: {
            type: Number,
            required: true
        }, 
        views: {
            type: Number, 
            default: 0
        }, 
        isPublished: {
            type: Boolean,
            default: true
        }, 
        owner:{
            type: Schema.Types.ObjectId, // taking from user model
            ref: "User"
        }
        
    },
    {
        timestamps: true
    }
)

// advanced queries for videoSchema model
videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema)