import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});

/* Setting up an Express server and connecting to MongoDB using Mongoose.
import express from "express";
const app = express();

;(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log("Connected to the database successfully");
        app.on("error", (error) => { // Handling express app errors - so how does this work ?
            console.error("Error in Express app", error);
            throw error;
        });

        app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
        });
    } catch (error) {
        console.error("Error connecting to the database", error);
        throw error;
    }
})(); // IIFE -> Immediately Invoked Function Expression 

*/

import connectToDatabase from "./db/mongoose.js";
import app from "./app.js";

connectToDatabase()
.then(() => {
    app.on("error", (error) => {
        console.error("Error in Express app", error);
        throw error;
    });
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
})
.catch((err) => {
    console.error("Failed to connect to the database", err);
});
 