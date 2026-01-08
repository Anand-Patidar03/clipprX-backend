import mongoose from "mongoose";
import { dbName } from "../constants.js";

const connectDB = async () => {
  try {
    const connInst = await mongoose.connect(
      `${process.env.MONGODB_URL}/${dbName}`
    );
    console.log(`MongoDB connected DB Host : ${connInst.connection.host}`);
  } catch (error) {
    console.error("mongo db error ocurred : ", error.message);
    process.exit(1);
  }
};

export default connectDB;
