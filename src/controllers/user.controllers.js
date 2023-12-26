import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { uploadFileOnCloudinary } from '../utils/CloudinaryFileUpload.js';
import { User } from '../models/user.models.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

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
  const avatar = await uploadFileOnCloudinary(
    avatarLocalPath,
    username,
    'Avatar'
  );
  const coverImage = await uploadFileOnCloudinary(
    coverImageLocalPath,
    username,
    'Cover_Image'
  );
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

const changePassword = asyncHandler(async (req, res) => {
  //get old and new passwords from frontend
  const { oldPassword, newPassword } = req.body;
  //compare old password with existing password
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  console.log(isPasswordCorrect);
  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Incorrect old password');
  }
  //update new password in database
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Password changed successfully', user));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  //get details from frontend
  const { username, fullName } = req.body;
  //check if fields are not empty
  if ([username, fullName].some((field) => field?.trim() === '')) {
    throw new ApiError(400, 'All fields are required');
  }
  //save details in database
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { username, fullName } },
    { new: true }
  ).select('-password');
  //Return response
  return res
    .status(200)
    .json(new ApiResponse(200, 'Account details updated successfully', user));
});

const updateAvatarImage = asyncHandler(async (req, res) => {
  //TODO: delete old image
  //get image file from frontend
  const avatarLocalPath = req.file?.path;
  //if no file is selected
  if (!avatarLocalPath) {
    throw new ApiError(400, 'Avatar file is missing');
  }
  //upload file on cloudinary
  const avatar = await uploadFileOnCloudinary(
    avatarLocalPath,
    req.user?.username,
    'Avatar'
  );
  if (!avatar.url) {
    throw new ApiError(
      400,
      'Error in uploading avatar image file on cloudinary'
    );
  }
  //Save file url in database
  await User.findByIdAndUpdate(
    req.user?._id,
    { avatar: avatar.url },
    { new: true }
  );

  //send response
  res
    .status(200)
    .json(new ApiResponse(200, 'Avatar image updated successfully'));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  //TODO: delete old image
  //get image file from frontend
  const coverImageLocalPath = req.file?.path;
  //if no file is selected
  if (!coverImageLocalPath) {
    throw new ApiError(400, 'Cover Image file is missing');
  }
  //upload file on cloudinary
  const coverImage = await uploadFileOnCloudinary(
    coverImageLocalPath,
    req.user?.username,
    'Cover_Image'
  );
  if (!coverImage.url) {
    throw new ApiError(
      400,
      'Error in uploading cover image file on cloudinary'
    );
  }
  //Save file url in database
  await User.findByIdAndUpdate(
    req.user?._id,
    { coverImage: coverImage.url },
    { new: true }
  );

  //send response
  res
    .status(200)
    .json(new ApiResponse(200, 'Cover image updated successfully'));
});

const getCurrentUserDetails = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, 'Current user fetched successfully', req.user));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  //get username from URL
  const { username } = req.params;
  //If username is missing
  if (!username?.trim()) {
    throw new ApiError(400, 'username is missing');
  }
  //Mongodb aggregation pipeline setup to find number of subscribers and number of channel subscribed by user
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'channel',
        as: 'subscribers',
      },
    },
    {
      $lookup: {
        from: 'subscriptions',
        localField: '_id',
        foreignField: 'subscriber',
        as: 'subscribedTo',
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: 'subscribers',
        },
        channelSubscribedToCount: {
          $size: 'subscribedTo',
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, '$subscribers.subscriber'] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
      },
    },
  ]);

  console.log(channel);

  //If channel does not exist
  if (!channel?.length) {
    throw new ApiError(404, 'Channel does not exist');
  }
  //return channel details
  return res
    .status(200)
    .json(
      new ApiResponse(200, 'User channel fetched successfully', channel[0])
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  //TODO:Take time to understand this API because MongoDB Aggregation Pipelines/Sub-piplelines are used here in nested manner
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'watchHistory',
        foreignField: '_id',
        as: 'watchHistory',
        pipeline: [
          {
            $lookup: {
              from: 'users',
              localField: 'owner',
              foreignField: '_id',
              as: 'owner',
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          //This will response owner details in object
          //We could return owner details without it but it would be an array response
          {
            $addFields: {
              owner: {
                $first: '$owner',
              },
            },
          },
        ],
      },
    },
  ]);
  //return response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        'User watch history fetched successfully',
        user[0].watchHistory
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  updateAccountDetails,
  updateAvatarImage,
  updateCoverImage,
  getCurrentUserDetails,
  getUserChannelProfile,
  getWatchHistory,
};
