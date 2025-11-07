import {v2 as cloudinary} from 'cloudinary';
import { ca } from 'date-fns/locale';
import fs from 'fs';

cloudinary.config({
    cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
    api_key : process.env.CLOUDINARY_API_KEY,
    api_secret : process.env.CLOUDINARY_API_SECRET
});

const uploadToCloudinary = async (filePath) => {
    try {
        if (!filePath) return null;
        //upload file to cloudinary
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto"
        })
        // file has been uploaded
        // console.log("File uploaded to cloudinary successfully", result.secure_url);

        fs.unlinkSync(filePath); // delete the file from local storage after upload
        return result ;

} catch (error) {
    fs.unlinkSync(filePath); // delete the file from local storage in case of error
    return null;


}
};

export {uploadToCloudinary};





 //directly using cloudinary api to upload file
 //but we are using local file path here , so we need to first save the file to local storage using multer and then upload to cloudinary
// cloudinary.v2.uploader
// .upload("dog.mp4", {
//   resource_type: "video", 
//   public_id: "my_dog",
//   overwrite: true, 
//   notification_url: "https://mysite.example.com/notify_endpoint"})
// .then(result=>console.log(result))}; 
