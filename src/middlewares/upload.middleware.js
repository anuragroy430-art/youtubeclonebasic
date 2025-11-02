import multer from 'multer';

const storage = multer.diskStorage({  // configure multer to save files to local storage first before uploading to cloudinary // copy pasted from multer docs
    destination: function (req, file, cb) { // req is from user , file is the file to be uploaded from multer , cb is callback
        cb(null, './public/temp/')
    },
    filename: function (req, file, cb) {
        
        cb(null,file.originalname)
    }
})
const upload = multer({ storage: storage });

export default upload;

// what does this file do ?
// this file configures multer middleware to handle file uploads in an Express.js application. It sets up storage options to save uploaded files to a temporary directory on the server's local storage ('./public/temp/') with their original filenames. The configured multer instance is then exported for use in other parts of the application where file uploads are needed.
 