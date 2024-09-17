import mongoose, { isObjectIdOrHexString } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  // 1) check if video exists
  const { videoId } = req.params;
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video Id is invalid");
  }

  // 2) check if video is already liked or not
  const likedAlready = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });

  let isLiked = false;
  // 3) if video is already liked then delete the like
  // else create a new like
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    isLiked = true;
  }

  // 4) send res
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        isLiked,
        isLiked ? "Video liked successfully" : "Video disliked successfully"
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  // 1) check if comment exists
  const { commentId } = req.params;
  if (!isObjectIdOrHexString(commentId)) {
    throw new ApiError(400, "Comment Id is invalid");
  }

  // 2) check if comment is already liked or not
  const likedAlready = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  let isLiked = false;
  // 3) if comment is already liked then delete the like
  // else create a new like
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    isLiked = true;
  }

  // 4) send res
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        isLiked,
        isLiked ? "Comment liked successfully" : "Comment disliked successfully"
      )
    );
});

// controller to get all videos liked by the loggedIn user
const getLikedVideos = asyncHandler(async (req, res) => {
  // 1)get all videos liked by the user
  const likedVideosAggegate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideo: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            avatar: 1,
          },
        },
      },
    },
  ]);

  if (likedVideosAggegate.length === 0) {
    throw new ApiError(404, "No videos found");
  }

  // 2) send res
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideosAggegate,
        "Liked videos fetched successfully"
      )
    );
});

export { toggleVideoLike, toggleCommentLike, getLikedVideos };
