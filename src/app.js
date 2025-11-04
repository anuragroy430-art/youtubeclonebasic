import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cors({
    origin : process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials : true,
}));

app.use(express.json({ limit: '16kb' })); // Middleware to parse JSON bodies with a limit of 16kb
app.use(express.urlencoded({ extended: true , limit: '16kb'})); // Middleware to parse URL-encoded bodies , like %20this%20 and + etc in urls
app.use(express.static('public')); // Serving static files from the 'public' directory , it means any file inside public folder can be accessed directly via browser
app.use(cookieParser()); // Middleware to parse cookies from incoming requests


//routes import 
import userRoutes from './routes/user.routes.js';
//route declaration
app.use('/api/v1/users', userRoutes); // when user hits /users route , userRoutes will handle it , this is middleware routing
//this gets prefixed to all routes inside userRoutes





export default app;