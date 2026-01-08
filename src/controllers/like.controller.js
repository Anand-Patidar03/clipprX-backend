import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { Video } from "../models/video.models.js";
import { Tweet } from "../models/tweet.models.js";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "video does not exist");
  }

  const like = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  let isLiked;

  if (like) {
    await Like.deleteOne({
      video: videoId,
      likedBy: req.user._id,
    });

    isLiked = false;
  } else {
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
    });
    isLiked = true;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, isLiked, "toggelled video like"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(400, "comment does not exist");
  }

  const like = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  let isLiked;

  if (like) {
    await Like.deleteOne({
      comment: commentId,
      likedBy: req.user._id,
    });

    isLiked = false;
  } else {
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
    });
    isLiked = true;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, isLiked, "toggelled comment like"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Channel id is invalid");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(400, "tweet does not exist");
  }

  const like = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  let isLiked;

  if (like) {
    await Like.deleteOne({
      tweet: tweetId,
      likedBy: req.user._id,
    });

    isLiked = false;
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
    });
    isLiked = true;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, isLiked, "toggelled tweet like"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const like = await Like.find({
    likedBy: userId,
    video: { $ne: null },
  })
    .populate({
      path: "video",
      select: "title thumbnail owner",
      populate: {
        path: "owner",
        select: "username avatar",
      },
    })
    .sort({
      createdAt: -1,
    });

  return res
    .status(200)
    .json(new ApiResponse(200, like, "liked video fetched successfully"));
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
