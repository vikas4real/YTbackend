import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadFileOnCloudinary } from '../utils/CloudinaryFileUpload.js';
import { User } from '../models/user.models.js';
import jwt from 'jsonwebtoken';

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //Save refresh Token in database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      'Something went wrong while generating Access and Refresh Tokens'
    );
  }
};

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
  const { username, email, password } = req.body;

  //VALIDATION- Check if required fields are not empty
  if (!(username || email)) {
    throw new ApiError(400, 'username or email required');
  }
  //CHECK If user already exists by E-MAIL and USERNAME
  const existingUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (!existingUser) {
    throw new ApiError(404, 'Username or E-mail not found');
  }
  //CHECK password
  const isPasswordValid = await existingUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Incorrect password');
  }
  //ACCESS and REFRESH TOKEN generation
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    existingUser._id
  );

  //Send tokens to frontend using Cookies or Local Storage
  const loggedInUser = await User.findById(existingUser._id).select(
    '-password -refreshToken'
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie('accessToken', accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        'User logged in successfully'
      )
    );
});

const logoutUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie('accessToken', options)
    .clearCookie('refreshToken', options)
    .json(new ApiResponse(200, 'User logged out successfully'));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized Request');
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, 'Invalid Refresh Token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired or already used!!');
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    res
      .status(200)
      .cookie('accessToken', accessToken, options)
      .cookie('refreshToken', refreshToken, options);
  } catch (error) {
    throw new ApiError(401, error?.message, 'Invalid refresh token');
  }
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
