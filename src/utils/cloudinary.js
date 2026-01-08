import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log("Cloudinary ENV check:", {
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
  secret: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING",
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const uploadResult = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // console.log("File uploaded successfully");

    // remove file from local storage after upload
    fs.unlinkSync(localFilePath);

    return uploadResult;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    fs.unlinkSync(localFilePath); // cleanup
    return null;
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
