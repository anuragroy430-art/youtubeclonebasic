import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
 
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
const coverImageLocalPath = req.files?.coverImage[0]?.path;

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

export {registerUser};

