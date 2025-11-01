
import mongoose , {Schema} from 'mongoose';
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";


const videoSchema = new Schema(
    {
        videoFileUrl : {
            type : String, // cloudinary url
            required : true,
        },
        thumbnail : {
           type : String, // cloudinary url
           required : true,
       },
        title : {
           type : String,
           required : true,
       },
        description : {
           type : String,
           required : true,
       },
        duration : {
           type : Number, // in seconds from cloudinary metadata
           required : true,
       },
        views : {
           type : Number,
           default : 0,
       },
        ispublished : {
           type : Boolean,
           default : true,
       },
        uploadedBy : {
           type : Schema.Types.ObjectId,
           ref : 'User',
           required : true,
       }
      

    },
    {timestamps:true}
);
videoSchema.plugin(mongooseAggregatePaginate); 



export const Video = mongoose.model('Video', videoSchema);