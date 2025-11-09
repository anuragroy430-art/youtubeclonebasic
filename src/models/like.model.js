import mongoose , {Schema} from "mongoose";

const likeSchema = new Schema({
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        
    },
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
        
    },
    tweetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tweet",
        
    },
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
},{timestamps: true});

const Like = mongoose.model("Like", likeSchema);

export {Like};