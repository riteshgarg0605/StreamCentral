import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const cookieOptions = {
  httpOnly: true,
  secure: true,
};

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 1) get user details from the frontend
  // 2) perform validation: not empty
  // 3) check if user already exists: through username or email
  // 4) handle avatar,coverImage: upload to cloudinary
  // 5) create user object -create entry in db
  // 6) check for user creation response
  // 7) handle the response: remove password & refreshToken field
  // 8) return response to frontend

  // 1) get user details from the frontend
  // console.log(req.body);

  const { username, email, fullname, password } = req.body;

  // 2) perform validation: not empty
  // if (fullname === "") {
  //   throw new ApiError(400, "Fullname is required")
  // }
  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  )
    throw new ApiError(400, "All fields are required");

  // 3) check if user already exists: through username or email
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new ApiError(400, "Username or email already exists");
  }

  // 4) handle avatar,coverImage: upload to cloudinary
  // console.log(req.files);

  let coverImageLocalFilePath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  )
    coverImageLocalFilePath = req.files.coverImage[0].path;

  const avatarLocalFilePath = req.files?.avatar[0]?.path;
  if (!avatarLocalFilePath) {
    throw new ApiError(400, "Avatar image is required");
  }
  console.log(coverImageLocalFilePath);

  const coverImage = await uploadOnCloudinary(coverImageLocalFilePath);
  const avatar = await uploadOnCloudinary(avatarLocalFilePath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // 5) create user object -create entry in db
  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username,
    email,
    password,
  });

  // 6) check for user creation response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // 7) handle the response: remove password & refreshToken field
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 8) return response to frontend
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!!"));
});

const loginUser = asyncHandler(async (req, res) => {
  // 1) get data from req.body
  // 2) check if username or email is present
  // 3) find user in db
  // 4) password check
  // 5) generate access & refresh Tokens
  // 6) return response to frontend with cookie

  // 1) get data from req.body
  const { username, email, password } = req.body;

  // 2) check if username or email is present
  if (!(username || email)) {
    //or if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  // 3) find user in db
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(400, "User does not exist");
  }

  // 4) password check
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password incorrect");
  }

  // 5) generate access & refresh Tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // 6) return response to frontend with cookie

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // TODO:
  // Instead of having another DB call just delete the password from already fetched user data
  // delete user.password;
  // console.log(loggedInUser);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  console.log("User ID:", req.user._id);
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    { new: true } //option to get new updated user value
  );
  console.log("Updated User:", user);
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1) Extract refreshToken from the incoming request
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    // 2) Decode the incoming refreshToken and verify it with token in DB
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select("-password");
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // 3) generate new access and refresh Tokens
    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    // 4) return res
    const email = user.email;
    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newRefreshToken)
      .json(
        new ApiResponse(
          200,
          { email, accessToken, refreshToken: newRefreshToken },
          "New tokens generated"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  // 1) take old and new password from the user
  const { oldPassword, newPassword } = req.body;

  // checck if both passwords recieved are same
  if (oldPassword === newPassword) {
    throw new ApiError(400, "Old and New passwords are same");
  }

  // 2) find user details from DB using user _id already decoded from cookie in auth middleware
  const user = await User.findById(req.user?._id);

  // 3) check if old password is same as that in DB(func already written in user model)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password incorrect");
  }

  // 4) save new password in DB
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // 5) return res
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  // 1) get details from user that have to be changed
  const { fullname, email } = req.body;

  // 2) check if the all the details that have to changed are present
  if (!fullname || !email) {
    throw new ApiError(400, "Fullname and email are required");
  }

  // 3) change the details in DB
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { fullname, email } },
    { new: true }
  ).select("-password -refreshToken");

  // 4) return res
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const localFilePath = req.file?.path;
  if (!localFilePath) {
    throw new ApiError(400, "Avatar file is missing");
  }
  // TODO: delete old avatar image on cloudinary
  const resp = await deleteFromCloudinary(req.user?.avatar);

  if (!resp) {
    throw new ApiError(400, "Error while deleting old Avatar");
  }

  const avatar = await uploadOnCloudinary(localFilePath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading Avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const localFilePath = req.file?.path;
  if (!localFilePath) {
    throw new ApiError(400, "Cover image file is missing");
  }
  // TODO: delete old cover image on cloudinary
  const resp = await deleteFromCloudinary(req.user?.coverImage);

  const coverImage = await uploadOnCloudinary(localFilePath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: coverImage.url } },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: { username: username.toLowerCase() },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "User fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  console.log(req.user);
  // const userid = req.user._id.toString();

  const user = await User.aggregate([
    {
      $match: {
        // both are working below:
        // _id: new mongoose.Types.ObjectId(`${req.user._id}`),
        _id: mongoose.Types.ObjectId.createFromHexString(
          req.user._id.toString()
        ),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
