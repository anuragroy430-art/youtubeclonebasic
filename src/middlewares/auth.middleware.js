import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";

export const verifyJWT = asyncHandler( async (req, res, next) => {
   try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
 
    if (!token) {
      throw new apiError(401, "Unauthorized access - token missing");
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
 
    const user = await User.findById(decoded?._id).select("-password -refreshTokens"); // exclude password and refreshTokens
 
    if (!user) {
      throw new apiError(401, "Unauthorized access - user not found");
    }
 
    req.user = user;
    next(); // proceed to the next middleware or route handler that is called after this middleware
   } catch (error) {
    throw new apiError(401, error?.message || "Unauthorized access - invalid token");
   }
});
//req.cookies to get cookies from browser
//we use ? optional chaining to avoid errors if cookies is undefined
//If accessToken is not found in cookies, we check the Authorization header
//authorization header is used in mobile apps or external clients where cookies might not be available
// in postman we can set authorization header manually
//The typical format of the Authorization header is "Bearer <token>" 
// so we split the string by space and take the second part as the token