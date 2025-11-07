import { Router } from "express";   
import { loginUser, registerUser , refreshAuthTokens} from "../controllers/user.controller.js"; // import registerUser controller function
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


export default router; 