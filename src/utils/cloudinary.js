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

// delete file from cloudinary
const deleteFromCloudinary = async (publicId, resourceType = "image") => {
    try {
        if (!publicId) return null;
        
        // delete file from cloudinary
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType // "image" or "video"
        });
        
        console.log("File deleted from cloudinary successfully", result);
        return result;
        
    } catch (error) {
        console.error("Error deleting file from cloudinary", error);
        return null;
    }
};

// extract public_id from cloudinary URL
const extractPublicId = (url) => {
    try {
        if (!url) return null;
        
        // Example URL: https://res.cloudinary.com/demo/image/upload/v1234567890/sample.jpg
        // Extract: sample (public_id)
        
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        
        if (uploadIndex === -1) return null;
        
        // Get everything after 'upload' and remove version (v1234567890)
        const pathAfterUpload = parts.slice(uploadIndex + 1).join('/');
        
        // Remove version prefix if exists (v1234567890/)
        const withoutVersion = pathAfterUpload.replace(/^v\d+\//, '');
        
        // Remove file extension
        const publicId = withoutVersion.substring(0, withoutVersion.lastIndexOf('.')) || withoutVersion;
        
        return publicId;
        
    } catch (error) {
        console.error("Error extracting public_id from URL", error);
        return null;
    }
};

export { uploadToCloudinary, deleteFromCloudinary, extractPublicId };





 //directly using cloudinary api to upload file
 //but we are using local file path here , so we need to first save the file to local storage using multer and then upload to cloudinary
// cloudinary.v2.uploader
// .upload("dog.mp4", {
//   resource_type: "video", 
//   public_id: "my_dog",
//   overwrite: true, 
//   notification_url: "https://mysite.example.com/notify_endpoint"})
// .then(result=>console.log(result))}; 
