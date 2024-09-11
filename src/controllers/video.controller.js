import { mongoose, isObjectIdOrHexString } from "mongoose";
import fs from "fs";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Comment } from "../models/comment.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  // 1) extract the query parameters
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  // 2) build the aggregation pipeline

  // fetch videos only that are set isPublished as true
  let match = { isPublished: true };
  // if (query) then search in title
  if (query) {
    match.title = { $regex: query, $options: "i" }; // Case-insensitive search
  }
  // to search videos of specific creator only
  if (userId) {
    if (isObjectIdOrHexString(userId))
      match.owner = new mongoose.Types.ObjectId(userId);
  }

  const aggregate = Video.aggregate([
    { $match: match },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: { owner: 0 },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // 3) use aggregatePaginate package to get paginated results
  const result = await Video.aggregatePaginate(aggregate, options);

  //4) send res
  res
    .status(200)
    .json(new ApiResponse(200, result, "Videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  // 1) get details and files from frontend
  const { title, description } = req.body;
  const thumbnailLocalFilePath = req.files?.thumbnail?.[0]?.path;
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;

  // 2) validate if all fields are present
  if (
    [title, description].some(
      (field) => field === undefined || field.trim() === ""
    )
  ) {
    await fs.promises.unlink(videoFileLocalPath);
    await fs.promises.unlink(thumbnailLocalFilePath);
    throw new ApiError(400, "Title and description are required");
  }

  // 3) handle videoFile, thumbnail: upload on cloudinary asynchronously
  if (!thumbnailLocalFilePath) {
    await fs.promises.unlink(videoFileLocalPath);
    throw new ApiError(400, "Thumbnail file is required");
  }
  if (!videoFileLocalPath) {
    await fs.promises.unlink(thumbnailLocalFilePath);
    throw new ApiError(400, "Video file is required");
  }
  const videoResponse = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalFilePath);

  if (!videoResponse || !thumbnailResponse) {
    throw new ApiError(500, "Error uploading files to server");
  }

  // 4) create video object -create entry in db
  //  check the cloudinary res for duration and set other fields
  const video = await Video.create({
    videoFile: videoResponse.url,
    duration: videoResponse.duration,
    thumbnail: thumbnailResponse.url,
    owner: req.user._id,
    title,
    description,
  });

  // 5) check is video is created
  const publishedVideo = await Video.findById(video._id);

  // 6)handle the response
  if (!publishVideo) {
    await fs.promises.unlink(videoFileLocalPath);
    await fs.promises.unlink(thumbnailLocalFilePath);
    deleteFromCloudinary(videoResponse.url);
    deleteFromCloudinary(thumbnailResponse.url);
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  // 7) send res
  return res
    .status(200)
    .json(new ApiResponse(200, publishedVideo, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const { videoId } = req.params;
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video id is invalid");
  }

  // 2) check if video exists in db
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              subscribersCount: 1,
              isSubscribed: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        video: 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 3) increment the video's view count
  await Video.findByIdAndUpdate(videoId, {
    $inc: { views: 1 },
  });

  // 4) If a user is logged in, add the video to user's watchHistory
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { watchHistory: videoId },
    });
  }

  // 5) send res
  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video found successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const { videoId } = req.params;
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video id is invalid");
  }

  // 2) check if video exists in db
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 3) check if only the owner of the video is making the request
  if (req.user.id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 4) Handle the fields to be updated
  //   extract the fields to be update from the req.body
  const { title, description } = req.body;

  // create an empty object to store the fields to be updated
  const fieldsToBeUpdated = {};

  // check which fields are sent by the user and add them to fieldsToBeUpdated object
  if (title) fieldsToBeUpdated.title = title;
  if (description) fieldsToBeUpdated.description = description;

  if (Object.keys(fieldsToBeUpdated).length === 0 && !req.files?.thumbnail) {
    throw new ApiError(400, "Fields to be updated are required");
  }

  // Check if thumbnail file is provided
  if (req.files?.thumbnail) {
    //   delete old thumbnail from cloudinary
    const deleteResponse_thumbnail = await deleteFromCloudinary(
      video.thumbnail
    );
    if (!deleteResponse_thumbnail) {
      throw new ApiError(500, "Error while deleting old thumbnail from server");
    }
    // upload new thumbnail to cloudinary
    const thumbnailLocalFilePath = req.files.thumbnail[0]?.path;
    const thumbnailResponse = await uploadOnCloudinary(thumbnailLocalFilePath);
    if (!thumbnailResponse) {
      throw new ApiError(500, "Error uploading thumbnail to server");
    }
    fieldsToBeUpdated.thumbnail = thumbnailResponse?.url;
  }

  //5) update the video with the new fields- db update
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    { $set: fieldsToBeUpdated },
    { new: true }
  );

  // 6) send res
  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const { videoId } = req.params;
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video id is invalid");
  }

  // 2) check if video exists in db
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 3) check if only the owner of the video is making the request
  if (req.user.id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 4) toggle the publish status and save in db
  video.isPublished = !video.isPublished;

  const updatedVideo = await video.save();
  if (!updatedVideo) {
    throw new ApiError(500, "Error changing publish status of the video");
  }

  // 5) send res
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { updatedVideo },
        "Publish status changed successfully"
      )
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const { videoId } = req.params;
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video id is invalid");
  }

  // 2) check if video exists in db
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 3) check if only the owner of the video is making the request
  if (req.user.id.toString() !== video.owner.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 4) delete the video and thumbnail files from cloudinary
  const deleteResponse_thumbnail = await deleteFromCloudinary(video.thumbnail);
  const deleteResponse_video = await deleteFromCloudinary(
    video.videoFile,
    "video"
  );
  if (!deleteResponse_video || !deleteResponse_thumbnail) {
    throw new ApiError(500, "Error while deleting files from server");
  }

  // remove the video from all playlists
  await Playlist.updateMany(
    { videos: videoId },
    { $pull: { videos: videoId } }
  );

  // delete video's likes
  await Like.deleteMany({
    video: videoId,
  });

  // delete video's comments
  await Comment.deleteMany({
    video: videoId,
  });

  await Video.findByIdAndDelete(videoId);
  // 5) send res
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
