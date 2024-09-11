import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
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
      resource_type: "auto",
      transformation: [
        {
          quality: "auto:good",
        },
      ],
    });
    // fs.unlinkSync(localFilePath);
    await fs.promises.unlink(localFilePath);
    return response;
  } catch (error) {
    // fs.unlinkSync(localFilePath);
    await fs.promises.unlink(localFilePath);
    console.log(error);
    return null;
  }
};
const deleteFromCloudinary = async (url, resource_type = "image") => {
  try {
    if (!url) return null;
    console.log(url);
    const publicId = url.substring(
      url.lastIndexOf("/") + 1,
      url.lastIndexOf(".")
    );
    console.log(publicId);
    // destroy file from cloudinary
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type,
    });
    return response;
  } catch (error) {
    console.log(error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };
