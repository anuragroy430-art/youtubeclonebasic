import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {apiError} from "../utils/apiError.js"
import {apiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadToCloudinary, deleteFromCloudinary, extractPublicId} from "../utils/cloudinary.js"


// this controller handles fetching all videos with pagination, search, sorting, and filtering
const getAllVideos = asyncHandler(async (req, res) => {
    // extract query parameters from the URL (e.g., /videos?page=1&limit=10&query=react&sortBy=views&sortType=desc&userId=123)
    // set default values if parameters are not provided
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;
    
    // build match stage for aggregation - this will filter which videos to show
    // $match in MongoDB aggregation is like WHERE clause in SQL
    const matchStage = { ispublished: true }; // only show published videos (not drafts/unpublished)
    
    // if userId is provided in query params, filter videos by that specific uploader
    // example: /videos?userId=507f1f77bcf86cd799439011 will show only that user's videos
    if (userId && isValidObjectId(userId)) {
        // convert string userId to MongoDB ObjectId for comparison
        // new mongoose.Types.ObjectId() creates a proper ObjectId from string
        matchStage.uploadedBy = new mongoose.Types.ObjectId(userId);
    }
    
    // if search query is provided, search in both title and description fields
    // example: /videos?query=javascript will find videos with "javascript" in title OR description
    if (query) {
        // $or operator means "match if ANY of these conditions is true"
        matchStage.$or = [
            // $regex performs pattern matching (like SQL LIKE)
            // $options: "i" makes search case-insensitive (JavaScript = javascript = JAVASCRIPT)
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ];
    }
    
    // build sort stage - determines the order of results
    // create empty object and dynamically set the sort field
    const sortStage = {};
    // sortBy can be "createdAt", "views", "title", etc.
    // sortType: "asc" = ascending (1, 2, 3 or A, B, C), "desc" = descending (3, 2, 1 or Z, Y, X)
    // 1 = ascending, -1 = descending in MongoDB
    sortStage[sortBy] = sortType === "asc" ? 1 : -1;
    
    // aggregation pipeline - series of stages that process data step by step
    // Video.aggregate() creates an aggregation query (doesn't execute yet, just builds it)
    const videoAggregate = Video.aggregate([
        // STAGE 1: $match - filter videos based on matchStage conditions
        // this reduces the dataset early for better performance
        { $match: matchStage },
        
        // STAGE 2: $lookup - perform a LEFT JOIN with users collection
        // this is like SQL: SELECT * FROM videos LEFT JOIN users ON videos.uploadedBy = users._id
        {
            $lookup: {
                from: "users", // the collection to join (MongoDB uses lowercase plural collection names)
                localField: "uploadedBy", // field from videos collection (the foreign key)
                foreignField: "_id", // field from users collection (the primary key)
                as: "uploaderDetails", // name of the output array field that will contain matched user documents
                
                // sub-pipeline: further process the joined user data
                pipeline: [
                    {
                        // $project: select only specific fields from user (like SELECT username, fullName, avatar)
                        // 1 means include this field, 0 would mean exclude
                        // this reduces data transfer and hides sensitive fields like password
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        
        // STAGE 3: $addFields - add new computed fields to each document
        {
            $addFields: {
                // uploaderDetails is currently an array (even though it only has 1 user)
                // $first extracts the first element from the array to make it a single object
                // changes from: uploaderDetails: [{username: "john", ...}]
                // to: uploaderDetails: {username: "john", ...}
                uploaderDetails: {
                    $first: "$uploaderDetails" // $ means "get the value of this field"
                }
            }
        },
        
        // STAGE 4: $sort - sort the results based on sortStage
        // example: { createdAt: -1 } sorts by newest first
        { $sort: sortStage }
    ]);
    
    // apply pagination using mongoose-aggregate-paginate-v2 plugin
    // this plugin was added in video.model.js with: videoSchema.plugin(mongooseAggregatePaginate)
    const options = {
        page: parseInt(page, 10), // convert string "1" to number 1, base 10
        limit: parseInt(limit, 10) // how many videos per page
    };
    
    // Video.aggregatePaginate() executes the aggregation with pagination
    // returns an object with: { docs: [], totalDocs: 100, page: 1, totalPages: 10, ... }
    const videos = await Video.aggregatePaginate(videoAggregate, options);
    
    // if aggregation fails and returns null/undefined, throw error
    if (!videos) {
        throw new apiError(500, "Error fetching videos");
    }
    
    // return standardized API response with videos data
    // status 200 = OK (success)
    return res.status(200).json(
        new apiResponse(200, videos, "Videos fetched successfully")
    );
})

//this controller handles publishing a new video and uploading video file and thumbnail to cloudinary
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    
    // validation - check if title and description are provided
    if ([title, description].some((field) => field?.trim() === "")) {
        throw new apiError(400, "Title and description are required");
    } //this also checks " " instead  of just ( !title || !description )
    //puts the value in a array // .some() method checks if any element in the array satisfies the condition.

    
    // check for video file upload
    const videoLocalPath = req.files?.videoFile[0]?.path;
    
    if (!videoLocalPath) {
        throw new apiError(400, "Video file is required");
    }
    
    // check for thumbnail upload
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    
    if (!thumbnailLocalPath) {
        throw new apiError(400, "Thumbnail is required");
    }
    
    // upload video to cloudinary
    const videoFile = await uploadToCloudinary(videoLocalPath);
    const thumbnail = await uploadToCloudinary(thumbnailLocalPath);
    
    if (!videoFile) {
        throw new apiError(500, "Error uploading video file");
    }
    
    if (!thumbnail) {
        throw new apiError(500, "Error uploading thumbnail");
    }
    
    // create video document in database
    const video = await Video.create({
        videoFileUrl: videoFile.secure_url,
        thumbnail: thumbnail.secure_url,
        title,
        description,
        duration: videoFile.duration || 0, // cloudinary returns duration for videos
        uploadedBy: req.user._id,
        ispublished: true
    });
    
    // fetch created video to confirm
    const createdVideo = await Video.findById(video._id).populate("uploadedBy", "username fullName avatar");
    //here _id is automatically created by mongodb when we create a new document , so we can use video._id to fetch the created video.
    // .populate() method is used to fetch the referenced user details from the User collection.


    if (!createdVideo) {
        throw new apiError(500, "Error publishing video");
    }
    
    return res.status(201).json(
        new apiResponse(201, createdVideo, "Video published successfully")
    );
}) 

//this controller handles fetching a video by its ID and incrementing its view count
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    // validate video id
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id");
    }// isValidObjectId checks if the provided id is a valid MongoDB ObjectId. , its a built in function of mongoose.
    
    // find video and populate uploader details
    const video = await Video.findById(videoId).populate("uploadedBy", "username fullName avatar");
    
    if (!video) {
        throw new apiError(404, "Video not found");
    }
    
    // increment view count
    video.views += 1;
    await video.save({ validateBeforeSave: false });
    
    return res.status(200).json(
        new apiResponse(200, video, "Video fetched successfully")
    );
})

//this controller handles updating video details like title, description, and thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    
    // validate video id
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id");
    }
    
    // check if at least one field is provided
    if (!title && !description && !req.file) {
        throw new apiError(400, "At least one field (title, description, or thumbnail) is required to update");
    }
    
    // find video and check ownership
    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new apiError(404, "Video not found");
    }
    
    // check if user is the owner of the video
    if (video.uploadedBy.toString() !== req.user._id.toString()) {
        throw new apiError(403, "You are not authorized to update this video");
    }
    
    // prepare update object
    const updateData = {};
    
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    
    // if thumbnail is uploaded, upload to cloudinary and delete old one
    if (req.file?.path) {
        const thumbnail = await uploadToCloudinary(req.file.path);
        
        if (!thumbnail) {
            throw new apiError(500, "Error uploading thumbnail");
        }
        
        // delete old thumbnail from cloudinary
        if (video.thumbnail) {
            const oldThumbnailPublicId = extractPublicId(video.thumbnail);
            if (oldThumbnailPublicId) {
                await deleteFromCloudinary(oldThumbnailPublicId, "image");
            }
        }
        
        updateData.thumbnail = thumbnail.secure_url;
    }
    
    // update video
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateData },
        { new: true }
    ).populate("uploadedBy", "username fullName avatar");
    
    if (!updatedVideo) {
        throw new apiError(500, "Error updating video");
    }
    
    return res.status(200).json(
        new apiResponse(200, updatedVideo, "Video updated successfully")
    );
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    // validate video id
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id");
    }
    
    // find video and check ownership
    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new apiError(404, "Video not found");
    }
    
    // check if user is the owner of the video
    if (video.uploadedBy.toString() !== req.user._id.toString()) {
        throw new apiError(403, "You are not authorized to delete this video");
    }// toString() converts the ObjectId to a string for comparison.
    
    // delete video and thumbnail from cloudinary
    if (video.videoFileUrl) {
        const videoPublicId = extractPublicId(video.videoFileUrl);
        if (videoPublicId) {
            await deleteFromCloudinary(videoPublicId, "video");
        }
    }
    
    if (video.thumbnail) {
        const thumbnailPublicId = extractPublicId(video.thumbnail);
        if (thumbnailPublicId) {
            await deleteFromCloudinary(thumbnailPublicId, "image");
        }
    }
    
    // delete video from database
    await Video.findByIdAndDelete(videoId);
    
    return res.status(200).json(
        new apiResponse(200, null, "Video deleted successfully")
    );
})


//this controller handles toggling the publish status of a video (publish/unpublish)
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    
    // validate video id
    if (!isValidObjectId(videoId)) {
        throw new apiError(400, "Invalid video id");
    }
    
    // find video and check ownership
    const video = await Video.findById(videoId);
    
    if (!video) {
        throw new apiError(404, "Video not found");
    }
    
    // check if user is the owner of the video
    if (video.uploadedBy.toString() !== req.user._id.toString()) {
        throw new apiError(403, "You are not authorized to modify this video");
    } // toString() converts the ObjectId to a string for comparison.
    
    // toggle publish status
    video.ispublished = !video.ispublished;
    await video.save({ validateBeforeSave: false });
    
    return res.status(200).json(
        new apiResponse(200, video, `Video ${video.ispublished ? 'published' : 'unpublished'} successfully`)
    );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}