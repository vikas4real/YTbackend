import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadFileOnCloudinary } from '../utils/CloudinaryFileUpload.js';
import { User } from '../models/user.models.js';

const registerUser = asyncHandler(async (req, res) => {
  //GET user details from frontend
  const { username, email, fullName, password } = req.body;

  //VALIDATION- Check if required fields are not empty
  if (
    [username, email, fullName, password].some((field) => field?.trim() === '')
  ) {
    throw new ApiError(400, 'All fields are required');
  }

  //CHECK If user already exists by E-MAIL and USERNAME
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existingUser) {
    throw new ApiError(409, 'username or E-mail already exist!!');
  }

  //CHECK for images availabilty- avatar image
  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is required');
  }
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage && req.files.coverImage.length > 0)
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //UPLOAD images to cloudinary- avatar image
  const avatar = await uploadFileOnCloudinary(avatarLocalPath);
  const coverImage = await uploadFileOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, 'Avatar file is required');
  }

  //CREATE user in DATABASE
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || '',
  });

  //CHECK if user is created or NOT & Remove password and refreshToken from response data

  const createdUser = await User.findById(user._id).select(
    '-password -refreshToken'
  );
  if (!createdUser) {
    throw new ApiError(500, 'Something went wrong while registering the user');
  }

  //RETURN RESPONSE
  return res
    .status(201)
    .json(new ApiResponse(200, 'User registered successfully', createdUser));
});

const loginUser = asyncHandler(async (req, res) => {
  //GET user details from frontend
  const { email, password } = req.body();

  //VALIDATION- Check if required fields are not empty
  if ([email, password].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }
  //CHECK If user already exists by E-MAIL and USERNAME
  const existingUser = User.findOne({
    email,
  });
});

export { registerUser, loginUser };
