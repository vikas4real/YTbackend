import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadFileOnCloudinary = async (localFilePath) => {
  try {
    //upload the file on cloudinary
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });
    //remove the locally saved temporary file as files saved successfully
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    //remove the locally saved temporary file as the file upload operation failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadFileOnCloudinary };
