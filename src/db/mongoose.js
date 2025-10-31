import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectToDatabase = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`Connected to the database: ${connectionInstance.connection.host} successfully`);
  } catch (error) {
    console.error("Error connecting to the database", error);
    process.exit(1); // Exit the process with failure code 1 - exit code 1 indicates that the program ended due to an error.
  }
};

export default connectToDatabase;