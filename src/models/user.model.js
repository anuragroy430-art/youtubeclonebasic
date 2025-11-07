import mongoose , {Schema} from 'mongoose';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    { // see the model picture in notes folder
    username :{
         type : String,
         required : true,
         unique : true,
         lowercase : true,
         trim : true,
         index : true, // makes searching enabled on this field
    },
    email : {
        type : String,
        required : true,
        unique : true,
        lowercase : true,
        trim : true,
    },
    fullName : {
        type : String,
        required : true,
        trim : true,
        index : true,
    },
    avatar : {
        type : String, // cloudinary url
        required : true 
    },
    coverImage : {
        type : String, // cloudinary url
    },
    watchedHistory : [{
        type : Schema.Types.ObjectId,
        ref : 'Video',
    }],
    password : {
        type : String, // always encrypt , dont store clear text password , this is a challenge for you to implement
        required : [true , "Password is required"],
        minlength : [6 , "Password must be at least 6 characters long"],
    },
    refreshTokens : {
        type : String,
    }
},{timestamps:true});

//password hashing before saving to database
userSchema.pre("save" ,async function(next) 
{ if(!this.isModified("password")) return next(); // if password is not modified , then no need to hash again
    this.password = await bcrypt.hash(this.password , 10); // 10 is salt rounds
    next();
}) 

userSchema.methods.isPasswordMatch = async function(password) {
  return await bcrypt.compare(password , this.password); // this.password is hashed password from database , bycrypt.compare will return true or false

}
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        { // payload 
            _id : this._id,
            username : this.username,
            email : this.email,
        },   
        process.env.ACCESS_TOKEN_SECRET,
        {expiresIn : process.env.ACCESS_TOKEN_EXPIRY},

        
    )
}

userSchema.methods.generateRefreshToken = function() {
     return jwt.sign(
        { // payload 
            _id : this._id,
        },   
        process.env.REFRESH_TOKEN_SECRET,
        {expiresIn : process.env.REFRESH_TOKEN_EXPIRY},

        
    )
}

export const User = mongoose.model('User', userSchema);

