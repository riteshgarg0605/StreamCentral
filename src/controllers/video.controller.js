import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
  let match = {};
  if (query) {
    match.title = { $regex: query, $options: "i" }; // Case-insensitive search
  }
  if (userId) {
    match.owner = mongoose.Types.ObjectId.createFromHexString(userId);
  }

  const sort = { [sortBy]: sortType === "asc" ? 1 : -1 };

  const aggregate = Video.aggregate([{ $match: match }, { $sort: sort }]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // 3) use aggregatePaginate package to get paginated results
  const result = await Video.aggregatePaginate(aggregate, options);

  //4) send res
  res
    .status(200)
    .json(new ApiResponse(200, { result }, "Videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  // 1) get details from frontend
  const { title, description } = req.body;

  // 2) validate if all fields are present
  if (!title || !description)
    throw new ApiError(400, "Title and description are required");

  // 3) handle videoFile, thumbnail: upload on cloudinary asynchronously
  const thumbnailLocalFilePath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalFilePath) {
    throw new ApiError(400, "Thumbnail file is required");
  }
  const videoFileLocalPath = req.files?.videoFile[0]?.path;
  if (!videoFileLocalPath) {
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
    videoFile: videoResponse?.url,
    duration: videoResponse?.duration,
    thumbnail: thumbnailResponse?.url,
    owner: req.user?._id,
    title,
    description,
  });

  // 5) check is video is created
  const publishedVideo = await Video.findById(video._id);

  // 6)handle the response
  if (!publishVideo) {
    throw new ApiError(500, "Something went wrong while publishing the video");
  }

  // 7) send res
  return res
    .status(200)
    .json(
      new ApiResponse(200, { publishedVideo }, "Video published successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const videoId = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }
  // 2) check if video exists in db
  const video = await Video.findByIdAndUpdate(
    videoId,
    { $inc: { views: 1 } },
    { new: true }
  );
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  // 3) send res
  return res
    .status(200)
    .json(new ApiResponse(200, { video }, "Video found successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const videoId = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }

  // 2) check if video exists in db
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  // 3) check if only the owner of the video is making the request
  const userId = req.user.id;

  if (userId != video.owner) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 4) Handle the fields to be updated
  //   extract the fields to be update from the req.body
  const { title, description, isPublished } = req.body;

  // create an empty object to store the fields to be updated
  const fieldsToBeUpdated = {};

  // check which fields are sent by the user and add them to fieldsToBeUpdated object
  if (title) fieldsToBeUpdated.title = title;
  if (description) fieldsToBeUpdated.description = description;
  if (isPublished) fieldsToBeUpdated.isPublished = isPublished;

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
    const thumbnailLocalFilePath = req.files?.thumbnail[0]?.path;
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
    .json(
      new ApiResponse(
        200,
        { video: updatedVideo },
        "Video updated successfully"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  // 1) get the videoId from the req.params
  const videoId = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }

  // 2) check if video exists in db
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  // 3) check if only the owner of the video is making the request
  const userId = req.user.id;
  if (userId != video.owner) {
    throw new ApiError(401, "Unauthorized access");
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
  const videoId = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video id is required");
  }

  // 2) check if video exists in db
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }

  // 3) check if only the owner of the video is making the request
  const userId = req.user;
  if (userId != videoId.owner) {
    throw new ApiError(401, "Unauthorized access");
  }

  // 4) delete the video and thumbnail files from cloudinary
  const deleteResponse_thumbnail = await deleteFromCloudinary(
    req.user?.thumbnail
  );
  const deleteResponse_video = await deleteFromCloudinary(req.user?.videoFile);
  if (!deleteResponse_video || !deleteResponse_thumbnail) {
    throw new ApiError(500, "Error while deleting files from server");
  }
  // TODO: delete all the likes and comments of the video
  // and also remove video from the playlists

  // 5) send res
  return res.status(200).json(200, {}, "Video deleted successfully");
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
