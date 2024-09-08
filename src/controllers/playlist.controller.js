import { Playlist } from "../models/playlist.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose, { isObjectIdOrHexString } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  // 1) extract the name and description from the request body
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "Name and description is required");
  }

  // 2) create a new playlist in db
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user.id,
  });
  if (!playlist) {
    throw new ApiError(500, "Error creating playlist");
  }

  // 3) send res
  res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  // 1) extract the name and description from the request body
  const { name, description } = req.body;
  if (!name || !description) {
    throw new ApiError(400, "Name and description is required");
  }

  // 2) check if playlist exists or not
  const { playlistId } = req.params;
  if (!isObjectIdOrHexString(playlistId)) {
    throw new ApiError(400, "Playlist Id is invalid");
  }
  const playlist = Playlist.findById(playlistId, { id, owner });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 3) check if only the owner is making the request
  if (playlist.owner.toString() !== req.user?.id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 4) update the playlist
  const updatedPlaylist = Playlist.findByIdAndUpdate(
    playlistId,
    { $set: { name, description } },
    { new: true }
  );

  // 5) send res
  res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  // 1) check if playlist exists or not
  const { playlistId } = req.params;
  if (!isObjectIdOrHexString(playlistId)) {
    throw new ApiError(400, "Playlist Id is invalid");
  }
  const playlist = Playlist.findById(playlistId, { id, owner });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 2) check if only the owner is making the request
  if (playlist.owner.toString() !== req.user?.id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 3) delete the playlist
  await Playlist.findByIdAndDelete(playlistId);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  // 1) check for playlistId & videoId
  const { playlistId, videoId } = req.params;
  if (!isObjectIdOrHexString(playlistId)) {
    throw new ApiError(400, "Playlist Id is invalid");
  }
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video Id is invalid");
  }

  // 2)check if playlist and video exists or not
  const playlist = Playlist.findById(playlistId, { id, owner });
  const video = Video.findById(videoId, { id, owner });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 3) check if only the owner of playlist is making the request
  if (playlist.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 4) add video to the playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  );
  if (!updatePlaylist) {
    throw new ApiError(500, "Error adding video to playlist");
  }

  // 5) send res
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video added to the playlist successfully"
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  // 1) check for playlistId & videoId
  const { playlistId, videoId } = req.params;
  if (!isObjectIdOrHexString(playlistId)) {
    throw new ApiError(400, "Playlist Id is invalid");
  }
  if (!isObjectIdOrHexString(videoId)) {
    throw new ApiError(400, "Video Id is invalid");
  }

  // 2)check if playlist and video exists or not
  const playlist = Playlist.findById(playlistId, { id, owner, videos });
  const video = Video.findById(videoId, { id, owner });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  if (!playlist.videos?.includes(videoId)) {
    throw new ApiError(404, "Video does not exist in the playlist");
  }

  // 3) check if only the owner of playlist is making the request
  if (playlist.owner?.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 4) remove video from the playlist
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  );
  if (!updatePlaylist) {
    throw new ApiError(500, "Error removing video from the playlist");
  }

  // 5) send res
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "Video removed from the playlist successfully"
      )
    );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  // 1) check for userId
  const { userId } = req.params;
  if (!isObjectIdOrHexString(userId)) {
    throw new ApiError(400, "User Id is invalid");
  }

  // 2) check if user exists or not
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 3) find the playlists of the user from db
  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId.createFromHexString(userId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },
    {
      $addFields: {
        totalVideos: { $size: "$videos" },
        totalViews: { $sum: "$videos.views" },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        totalVideos: 1,
        totalViews: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (!playlists) {
    throw new ApiError(404, "No playlist found");
  }

  // 4) send res
  res
    .status(200)
    .json(new ApiResponse(200, playlists, "User playlists found successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  // 1) check if playlist exists or not
  const { playlistId } = req.params;
  if (!isObjectIdOrHexString(playlistId)) {
    throw new ApiError(400, "Playlist Id is invalid");
  }
  const playlist = Playlist.findById(playlistId, { id, owner });
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 2) check if only the owner is making the request
  if (playlist.owner.toString() !== req.user?.id.toString()) {
    throw new ApiError(403, "Unauthorized request");
  }

  // 3) get playlist with all the videos
  const playlistVideos = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId.createFromHexString(playlistId),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: {
          $match: {
            "videos.isPublished": true,
          },
        },
      },
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
      $addFields: {
        totalVideos: {
          $size: "$videos",
        },
        totalViews: {
          $sum: "$videos.views",
        },
        owner: {
          $first: "$owner",
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: 1,
        totalViews: 1,
        videos: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          duration: 1,
          createdAt: 1,
          views: 1,
        },
        owner: {
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (!playlistVideos) {
    throw new ApiError(404, "Playlist not found");
  }

  // 4) send res
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlistVideos[0], "Playlist fetched successfully")
    );
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
