import { Router } from "express";   
import { registerUser } from "../controllers/user.controller.js"; // import registerUser controller function
// registerUser is auto imported from user.controller.js file
import {upload} from "../middlewares/upload.middleware.js";
const router = Router();

router.route("/register").post( 
    
    upload.fields([   // multer middleware to handle file upload from form data
        {name: 'avatar', maxCount: 1}, // profileImage is the name of the field in form data
        {name: 'coverImage', maxCount: 1}    // coverImage is the name of the field in form data
    ]), 
    
    registerUser ); // POST request to /users/register will be handled by registerUser controller

export default router; 