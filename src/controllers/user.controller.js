import {asyncHandler} from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";


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

export {registerUser, loginUser, logoutUser , refreshAuthTokens};

