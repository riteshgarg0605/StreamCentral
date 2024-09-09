import mongoose, {
  isObjectIdOrHexString,
  isObjectIdOrHexString,
} from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscription.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  // 1) check if channel id is valid
  const { channelId } = req.params;
  if (!isObjectIdOrHexString(channelId)) {
    throw new ApiError(400, "Invalid channelId");
  }

  // 2) check if the user is a subscriber or not
  const isSubscribed = await Subscription.findOne({
    subscriber: req.user?._id,
    channel: channelId,
  });

  let subscribed, resMsg;
  // delete subscription if user is subscribed
  // else create a new subscription
  if (isSubscribed) {
    await Subscription.findByIdAndDelete(isSubscribed?._id);
    subscribed = false;
    resMsg = "Unsubscribed successfully";
  } else {
    await Subscription.create({
      subscriber: req.user?._id,
      channel: channelId,
    });
    subscribed = true;
    resMsg = "Subscribed successfully";
  }

  // 3) send res
  return res.status(200).json(new ApiResponse(200, subscribed, resMsg));
});

// subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // 1) check if channel id is valid
  let { channelId } = req.params;
  if (!isObjectIdOrHexString(channelId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  // 2) fetch the subscribers list
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId.createFromHexString(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribedToSubscriber",
            },
          },
          {
            $addFields: {
              subscribedToSubscriber: {
                $cond: {
                  if: {
                    $in: [channelId, "$subscribedToSubscriber.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
              subscribersCount: {
                $size: "$subscribedToSubscriber",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscriber",
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          subscribedToSubscriber: 1,
          subscribersCount: 1,
        },
      },
    },
  ]);

  // 3) send res
  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Subscribers fetched successfully")
    );
});

// channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  // 1) check if subscriber id is valid
  const { subscriberId } = req.params;
  if (!isObjectIdOrHexString(subscriberId)) {
    throw new ApiError(400, "Subscriber id is invalid");
  }

  // 2) fetch channel list to whom user has subscribed to
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId.createFromHexString(
          subscriberId
        ),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "subscribedChannel",
        pipeline: [
          {
            $lookup: {
              from: "videos",
              localField: "_id",
              foreignField: "owner",
              as: "videos",
            },
          },
          {
            $addFields: {
              latestVideo: {
                $last: "$videos",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: "$subscribedChannel",
    },
    {
      $project: {
        _id: 0,
        subscribedChannel: {
          _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
          latestVideo: {
            _id: 1,
            videoFile: 1,
            thumbnail: 1,
            owner: 1,
            title: 1,
            description: 1,
            duration: 1,
            createdAt: 1,
            views: 1,
          },
        },
      },
    },
  ]);

  // 3) send res
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
