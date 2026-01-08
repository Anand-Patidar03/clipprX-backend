import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user._id;

  const Totalvideo = await Video.aggregate([
    {
      $match: {
        owner: channelId,
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
        Totalvideo: { $sum: 1 },
      },
    },
  ]);

  const totalLikes = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },
    {
      $match: {
        "video.owner": channelId,
      },
    },
    {
      $count: "totalLikes",
    },
  ]);
  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        Totalvideo,
        totalLikes,
        totalSubscribers,
        totalViews: Totalvideo,
      },
      "Channel stats fetched successfully"
    )
  );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const channelId = req.user._id;

  const videos = await Video.find({
    owner: channelId,
  })
    .sort({ createdAt: -1 })
    .limit(limitNumber);

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
