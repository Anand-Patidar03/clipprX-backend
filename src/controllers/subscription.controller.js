import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  const channel = await User.findById(channelId);

  if (!channel) {
    throw new ApiError(400, "Channel id does not exist");
  }

  const isSubscriberExist = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user._id,
  });

  let isSubscribed;

  if (isSubscriberExist) {
    isSubscribed = await Subscription.deleteOne({
      channel: channelId,
      subscriber: req.user._id,
    });
  }

  if (!isSubscriberExist) {
    isSubscribed = await Subscription.create({
      channel: channelId,
      subscriber: req.user?._id,
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, isSubscribed, "subscription togglled"));
});

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  const fetchChannel = await User.findById(channelId);

  if (!fetchChannel) {
    throw new ApiError(400, "Channel id does not exist");
  }

  if (fetchChannel?._id.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "owner Id mismatched");
  }

  const subscribers = await Subscription.find({
    channel: channelId,
  }).populate("subscriber", "username avatar");

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribers,
        totalSubscribers,
      },
      "Channel subscribers fetched successfully"
    )
  );
});

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
    throw new ApiError(400, "subscriber id is invalid");
  }

  const subscriber = await User.findById(subscriberId);

  if (!subscriber) {
    throw new ApiError(400, "subscriber id does not exist");
  }

  if (subscriber?._id.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "owner Id mismatched");
  }

  const subscribedChannel = await Subscription.find({
    subscriber: subscriberId,
  }).populate("channel", "username avatar");

  const totalSubscribedChannel = await Subscription.countDocuments({
    subscriber: subscriberId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribedChannel,
        totalSubscribedChannel,
      },
      "Subscribed channel got successfully"
    )
  );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
