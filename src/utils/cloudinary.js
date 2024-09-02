import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
import { response } from "express";
dotenv.config({ path: "./.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // Upload file to cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "image",
    });
    // console.log("File has been upload on cloudinary successfully!!");
    console.log("Cloudinary URL: ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    console.log(error);
    return null;
  }
};
const deleteFromCloudinary = async (url) => {
  try {
    if (!url) return null;
    const publicId = url.substring(
      url.lastIndexOf("/") + 1,
      url.lastIndexOf(".")
    );
    // destroy file from cloudinary
    console.log("Deleting old file from cloudinary");

    const response = await cloudinary.uploader.destroy(publicId);
    // console.log("File has been deleted from cloudinary successfully!!");
    console.log("Cloudinary res: ", response);
    return response;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
