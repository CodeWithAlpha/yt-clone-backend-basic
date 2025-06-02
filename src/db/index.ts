import mongoose from "mongoose";
import { DB_NAME } from "../constant";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.DB_URI}/${DB_NAME}`
    );
    console.log("Mongo DB connected ", connectionInstance.connection.host);
  } catch (error) {
    console.log("DB connection error: ", error);
    process.exit(1);
  }
};

export default connectDB;
