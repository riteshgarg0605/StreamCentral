import { Comment } from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

const getVideoComments = asyncHandler(async (req, res) => {
  // 1) extract the query parameters and videoId
  const videoId = req.params.id;
  const { page = 1, limit = 10, sortType = "desc" } = req.query;

  // 2) build the aggregation pipeline
  const commentsAggregate = Comment.aggregate([
    {
      $match: { video: mongoose.Types.ObjectId.createFromHexString(videoId) },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
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
      $sort: { ["createdAt"]: sortType === "asc" ? 1 : -1 },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
        isLiked: 1,
      },
    },
  ]);

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  // 3) perform pagination
  const result = await Comment.aggregatePaginate(commentsAggregate, options);
  if (!result) {
    throw new ApiError(500, "Error fetching comments");
  }

  // 4) handle the result and send response
  let resMsg = "Comments fetched successfully";
  if (!result.docs.length) {
    resMsg = "No comments available";
  }
  res.status(200).json(new ApiResponse(200, result, resMsg));
});

const addComment = asyncHandler(async (req, res) => {
  // 1) check if content is sent in the req.body or not
  const content = req.body?.content;
  if (!content || !req.body) {
    throw new ApiError(400, "Comment's content is required");
  }

  // 2) check if video is present in db or not
  const videoId = req.params.id;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 3) save comment in db
  const comment = await Comment.create({
    content,
    owner: req.user.id,
    video: videoId,
  });

  if (!comment) {
    throw new ApiError(500, "Error creating comment");
  }

  // 4) send res
  res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // 1) check if comment is present in req.params
  const commentId = req.params.id;
  if (!commentId) {
    throw new ApiError(400, "Comment Id is required");
  }

  // 2) check if content is sent in the req.body or not
  const content = req.body?.content;
  if (!content || !req.body) {
    throw new ApiError(400, "Comment's content is required");
  }

  // 3) check if current user is the owner of comment or not
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not foumd");
  }
  if (comment.owner.toString() !== req.user.id.toString()) {
    throw new ApiError(401, "Unauthorised request");
  }

  // 4) update comment in db
  comment.content = content;
  const updatedComment = await comment.save();
  if (!updatedComment) {
    throw new ApiError(500, "Error updating the comment");
  }

  // 5)send res
  res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // 1) check if comment is present in req.params
  const commentId = req.params.id;
  if (!commentId) {
    throw new ApiError(400, "Comment Id is required");
  }

  // 2) check if current user is the owner of comment or not
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(500, "Comment not foumd");
  }
  if (comment?.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(401, "Unauthorised request");
  }

  // 3) delete comment from db

  // delete all the likes of the comment
  await Like.deleteMany({
    comment: commentId,
    likedBy: req.user,
  });

  // delete the comment
  const deletedComment = await Comment.findByIdAndDelete(commentId);
  if (!deletedComment) {
    throw new ApiError(500, "Error deleting the comment");
  }

  // 4)send res
  res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, deleteComment, updateComment };
