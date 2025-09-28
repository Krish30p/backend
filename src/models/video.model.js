import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
    {
        videoFile:{
            type: String,      //cloudinary url 
            required: true,
        },
        thumbnail:{
            type: String,      //cloudinary url 
            required: true,
        },
        tittle:{
            type: String,      
            required: true,
        },
        description:{
            type: String,     
            required: true,
        },
        duration:{
            type: Number,     
            required: true,
        },
        views: {
            type: number,
            defaullt:0
        },
        isPublished: {
            type: boolean,
            default: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: ""

        }


    },

    {timestamps: true}
)
VideoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video")