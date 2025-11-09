import { Router } from "express";   
import { loginUser, registerUser , refreshAuthTokens, changeCurrentPassword, getCurrentUserProfile, updateUserProfile, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory} from "../controllers/user.controller.js"; // import registerUser controller function
// registerUser is auto imported from user.controller.js file
import {upload} from "../middlewares/upload.middleware.js";
import { logoutUser } from "../controllers/user.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post( 
    
    upload.fields([   // multer middleware to handle file upload from form data
        {name: 'avatar', maxCount: 1}, // profileImage is the name of the field in form data
        {name: 'coverImage', maxCount: 1}    // coverImage is the name of the field in form data
    ]), 
    
    registerUser ); // POST request to /users/register will be handled by registerUser controller


router.route("/login").post(loginUser); // POST request to /users/login will be handled by loginUser controller ) 

//secured routes
router.route("/logout").post(verifyJWT ,  logoutUser); // POST request to /users/logout will be handled by logoutUser controller )

router.route("/refresh-token").post(refreshAuthTokens); // POST request to /users/refresh-token will be handled by refreshAuthTokens controller

router.route("/change-password").post(verifyJWT, changeCurrentPassword); // POST request to /users/change-password will be handled by changeCurrentPassword controller

router.route("/profile").get( verifyJWT, getCurrentUserProfile); // GET request to /users/profile/:userId will be handled by getCurrentUser Profile controller

//patch request as we are updating user profile partially
router.route("/update-account").patch(verifyJWT, updateUserProfile); // PATCH request to /users/update-account will be handled by updateUserProfile controller

//for file upload using multer single file upload
router.route("/update-avatar").patch(verifyJWT, upload.single('avatar'), updateUserAvatar); // PATCH request to /users/update-avatar will be handled by updateUserAvatar controller

router.route("/update-cover-image").patch(verifyJWT, upload.single('coverImage'), updateUserCoverImage); // PATCH request to /users/update-cover-image will be handled by updateUserCoverImage controller


//for req.params we use : to denote a param in the route
router.route("/c/channel/:username").get(verifyJWT, getUserChannelProfile); // GET request to /c/channel/:username will be handled by getUserChannelProfile controller

router.route("/watch-history").get(verifyJWT, getWatchHistory); // GET request to /users/watch-history will be handled by getWatchHistory controller


export default router;