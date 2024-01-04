import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import { uploadFileOnCloudinary } from '../utils/CloudinaryFileUpload';
import { asyncHandler } from '../utils/asyncHandler';
import { Video } from '../models/video.models.js';

export const uploadVideoFile = asyncHandler(async (req, res) => {
  //GET video details from frontend
  const { title, description } = req.body;
  //VALIDATION- Check if required fields are not empty
  if ([title, description].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }
  //get video file from frontend
  const videoLocalPath = req.file?.path;
  //Check if video file is selected or not
  if (!videoLocalPath) {
    throw new ApiError(400, 'Video file is missing');
  }
  //upload file on cloudinary
  const video = await uploadFileOnCloudinary(
    videoLocalPath,
    req.user?.username,
    'Videos'
  );
  if (!video.url) {
    throw new ApiError(400, 'Error in uploading video file on cloudinary');
  }
  //Save video file url in database
  await Video.create({
    videoFile: video.url,
    thumbnailImage: thumbnail.url,
    title: title,
    description: description,
    duration: video.metadata, //TODO: need to extract duration from metadata
    owner: req.user?._id,
  });
  //send response
  res.status(200).json(new ApiResponse(200, 'Video updloaded successfully'));
});
