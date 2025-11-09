import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import { sub } from "date-fns";
import mongoose from "mongoose";


const generateAuthTokens = async (userId) => // function to generate access and refresh tokens , what does this method do ? 

{
    try{
        const user = await User.findById(userId); // find user by id 
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshTokens = refreshToken;
        await user.save({validateBeforeSave : false}); // disable validation before saving , because we are only updating refresh token
//when we will save , mongoose will try to validate all fields , but we are only updating refresh token , so other fields may be invalid , so we disable validation before saving
        return {accessToken , refreshToken}; // return both tokens as object



    }catch(error){
        throw new apiError(500,"Error generating auth tokens");
    }
}
 
const registerUser = asyncHandler (async (req, res, next) => {
// asyncHandeler is a higher order function that takes async function as input and returns a function that handles errors

    // res.status(200).json({
    //     success : true,
    //     message : "User registered successfully",
    // }) // this is just a test response

 const { username , email , fullName , password } = req.body; // destructuring , getting data from request body , what is req.body ? when user sends data to server , data is sent in request body
 console.log("email",email); // for testing 

//  if(fullName === ""){ 
//     throw new apiError(400,"Full name is required");
//  } // we have to write a lot of if statements to validate data 

if ( [username, email, fullName, password].some((field) => field?.trim() === "")) {
    throw new apiError(400,"All fields are required");
} //  we will write a better validation using joi or yup later

const existedUser = await User.findOne({ $or : [{username} , {email}]}) // check if user already exists with same username or email
if(existedUser){
    throw new apiError (409 , "User with same username or email already exists");
}

const avatarLocalPath = req.files?.avatar[0]?.path;
// const coverImageLocalPath = req.files?.coverImage[0]?.path;

let coverImageLocalPath = null;
if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    coverImageLocalPath = req.files.coverImage[0].path;
}


if(!avatarLocalPath){
    throw new apiError(400,"Avatar image is required");
}

const avatar = await uploadToCloudinary(avatarLocalPath);
const coverImage = await uploadToCloudinary(coverImageLocalPath);

if(!avatar){
    throw new apiError(500,"Error uploading avatar image");
}

const user =await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatar.secure_url,
    coverImage: coverImage ? coverImage.secure_url : undefined, // if coverImage is uploaded , then set the url , else undefined
})

const createdUser = await User.findById(user._id).select("-password -refreshTokens"); // exclude password and refreshTokens  from the response

if(!createdUser){
    throw new apiError(500,"Error creating user");  
}

res.status(201).json(
    new apiResponse(201, createdUser, "User registered successfully")
)


}); 

const loginUser = asyncHandler (async (req, res, next) => {

const {email ,  username , password} = req.body;

if (!email && !username){
    throw new apiError(400,"Email or username is required to login");
}
 const user = await User.findOne({
    $or : [
        {email},
        {username}
    ]
})

if(!user){
    throw new apiError(404,"User not found");
}

const isPassMatch = await user.isPasswordMatch(password); // method defined in user model
if(!isPassMatch){
    throw new apiError(401,"Invalid credentials");  
}

const {accessToken , refreshToken} = await generateAuthTokens(user._id);

//now we have to decide what to do as our user was declared earlier above so refresh token is already set there 
// but we are calling the generateAuthTokens method which again sets the refresh token and saves the user
//now we can do two things either we can do some db calls again ( might be expensive )

const loggedInUser = await User.findById(user._id).select("-password -refreshTokens"); // exclude password and refreshTokens from the response

const options = {
    httpOnly : true,
    secure : true , 
    }
return res
.status(200)
.cookie("accessToken" , accessToken , options)
.cookie("refreshToken" , refreshToken , options)
.json(
    new apiResponse(200, {user : loggedInUser , accessToken ,refreshToken}, "User logged in successfully")
    // here we are sending user data along with tokens in response body 
    //why do we need to send tokens in response body when we are already sending them as cookies ?
    // because in some cases client may not be able to read cookies ( like mobile apps) and they may need tokens in response body
)






});

const logoutUser = asyncHandler (async (req, res, next) => {
await User.findByIdAndUpdate(
    req.user._id,
    {
        $set : { refreshTokens : undefined} // remove all refresh tokens on logout
    },

    { new : true } // return the updated document
)
const options = {
    httpOnly : true,
    secure : true , 
    }
    return res
    .status(200)
    .clearCookie("accessToken" , options)
    .clearCookie("refreshToken" , options)
    .json(
        new apiResponse(200, null, "User logged out successfully")
    );

});    

const refreshAuthTokens = asyncHandler (async (req, res, next) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken ; // get refresh token from cookies or for app clients from body
    if(!incomingRefreshToken){
        throw new apiError(401,"Unauthorized request - no refresh token"); // if no refresh token is provided 
    }
    try {
        const decoded = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET); //decode the token to get user id
        const user = await User.findById(decoded?._id);
        if(!user || user?.refreshTokens !== incomingRefreshToken){
            throw new apiError(404,"invalid refresh token - user not found");
        }
        const options = {
            httpOnly : true,
            secure : true ,
        }
        const {accessToken , newRefreshToken} = await generateAuthTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , newRefreshToken , options)
        .json(
            new apiResponse(200, {accessToken , newRefreshToken}, "Auth tokens refreshed successfully")
        );
    } catch (error) {
        throw new apiError(401, error?.message || "Invalid or expired refresh token");
        
    }


});

const changeCurrentPassword = asyncHandler (async (req, res, next) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new apiError(400, "Current password and new password are required");
    }
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new apiError(404, "User not found");
    }
    const isMatch = await user.isPasswordMatch(currentPassword);
    if (!isMatch) {
        throw new apiError(401, "Current password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false }); // disable validation before saving
    return res.status(200).json(new apiResponse(200, null, "Password changed successfully"));
}); 

const getCurrentUserProfile = asyncHandler (async (req, res, next) => { 
   return res.status(200).json(
    new apiResponse(200, req.user, "User profile fetched successfully")
   );
}); 

const updateUserProfile = asyncHandler (async (req, res, next) => {
    const { fullName, username } = req.body;
    if (!fullName || !username) {
        throw new apiError(400, "Name and username are required");
    }
   const user = await User.findByIdAndUpdate(
    req.user._id,
    {  $set : { 
            fullName,
            username
        } 
    },
    { new : true } // return the updated document
   ).select("-password -refreshTokens"); // exclude password and refreshTokens from the response

   if(!user){
    throw new apiError(500,"Error updating user profile");
   }
    return res.status(200).json(new apiResponse(200, user, "User profile updated successfully"));
});

const updateUserAvatar = asyncHandler (async (req, res, next) => {

    const avatarLocalPath= req.file?.path; // we used file instead of files because we are uploading single file
    //multer gives us the path of the uploaded file in req.file for single file upload
    if(!avatarLocalPath){
        throw new apiError(400,"Avatar image is required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);

    if(!avatar){
        throw new apiError(500,"Error uploading avatar image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set :
             { 
                avatar : avatar.secure_url 
            } 
        },
        { new : true } // return the updated document
    ).select("-password -refreshTokens"); // exclude password and refreshTokens from the response

    return res
    .status(200)
    .json(new apiResponse(200, avatar.secure_url, "User avatar updated successfully"));

});

const updateUserCoverImage = asyncHandler (async (req, res, next) => {
 
    const coverImageLocalPath= req.file?.path; // we used file instead of files because we are uploading single file
    //multer gives us the path of the uploaded file in req.file for single file upload
    if(!coverImageLocalPath){
        throw new apiError(400,"Cover image is required");
    }

    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if(!coverImage){
        throw new apiError(500,"Error uploading cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set :
             { 
                coverImage : coverImage.secure_url 
            } 
        },
        { new : true } // return the updated document
    ).select("-password -refreshTokens"); // exclude password and refreshTokens from the response

    return res
    .status(200)
    .json(new apiResponse(200, coverImage.secure_url, "User cover image updated successfully"));

});

const getUserChannelProfile = asyncHandler (async (req, res, next) => {

    const { username } = req.params;

    if(!username?.trim()){
        throw new apiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        { // this matches the id of the user with the channel field in subscriptions collection ( cz to get subscribers of this channel))
            $lookup : {
                from : "subscriptions", // collection to join
                localField: "_id", // field from the input documents
                foreignField: "channel", // field from the documents of the "from" collection
                as : "subscribers" // output array field
            }
        },
        { // this matches the id of the user with the subscriber field in subscriptions collection ( cz to get channels to which this user is subscribed))
            $lookup : {
                from : "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as : "subscribedTo" // channels to which this user is subscribed
            }
        },
        {
            $addFields : {
                subscriberCount : { $size : "$subscribers" }, // size of subscribers array
                subscribedToCount : { $size : "$subscribedTo" }, // size of subscribedTo array


                isSubscribed : {
                    $cond : {
                        if : {
                            $in : [ req.user?._id , "$subscribers.subscriber" ] // check if logged in user id is in subscribers array  and subscriber object 
                        },
                        then : true,   
                        else : false
                    }       
            }

                }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                avatar : 1,
                coverImage : 1,
                subscriberCount : 1,
                subscribedToCount : 1,
                isSubscribed : 1,
                
            }
        } 
    

    ]) // aggregation pipeline to get channel profile along with subscriber count and subscription status

    if(!channel?.length === 0){
        throw new apiError(404, "Channel not found");
    }
    return res
    .status(200)
    .json(new apiResponse(200, channel[0], "Channel profile fetched successfully"));








});

const getWatchHistory = asyncHandler (async (req, res, next) => {

    const user = await User.aggregate([
        {
            $match : {
                // _id : req.user._id  // this wont work as mongoose is not working here in aggregation pipeline, so we need to convert it to ObjectId
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos", // why videos instead of video model ? cz in aggregation pipeline we have to use collection name
                localField : "watchedHistory",
                foreignField : "_id",
                as : "watchHistoryVideos" ,
                pipeline : [ // sub pipeline to lookup uploader details
                    {
                        $lookup : { // lookup uploader details
                            from : "users",
                            localField : "uploadedBy",
                            foreignField : "_id",
                            as : "uploaderDetails",
                            pipeline : [
                                {
                                    $project : { // exclude password and refreshTokens from uploader details
                                        fullName : 1 ,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                         $addFields : { // to get single object instead of array , can use $arrayElemAt as well
                            uploaderDetails : { 
                                $first : "$uploaderDetails"  // as uploaderDetails is an array with single object
                                 }
                         }
                    }
                ]
            }
        },
        
    ]);

    return res
    .status(200)
    .json(new apiResponse(200, user[0].watchHistoryVideos, "User watch history fetched successfully"))


});

   

export {
      registerUser, 
      loginUser,
      logoutUser ,
      refreshAuthTokens , 
      changeCurrentPassword , 
      getCurrentUserProfile , 
      updateUserProfile , 
      updateUserAvatar , 
      updateUserCoverImage,
      getUserChannelProfile,
      getWatchHistory
    };

