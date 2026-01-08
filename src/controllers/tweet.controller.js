import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  const content = req.body.content;

  if (!content) {
    throw new ApiError(400, "Tweet content is required");
  }

  const owner = req.user._id;

  const tweet = await Tweet.create({
    content,
    owner,
  });

  console.log(tweet);

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const tweets = await Tweet.find({
    owner: userId,
  }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "user tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const tweetId = req.params?.tweetId;
  const newTweet = req.body.content;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(401, "tweetId is not valid");
  }

  if (!newTweet) {
    throw new ApiError(400, "Updated tweet is missing");
  }

  const tweetFind = await Tweet.findById(tweetId);

  if (!tweetFind) {
    throw new ApiError(400, "Tweet is not found");
  }

  if (!tweetFind.owner.equals(req.user?._id)) {
    throw new ApiError(401, "User mismatched ERROR");
  }

  tweetFind.content = newTweet;
  await tweetFind.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweetFind, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const tweetId = req.params?.tweetId;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(401, "tweetId is not valid");
  }

  const tweetFind = await Tweet.findById(tweetId);

  if (!tweetFind) {
    throw new ApiError(400, "Tweet is not present");
  }

  if (!tweetFind.owner.equals(req.user?._id)) {
    throw new ApiError(401, "User mismatched ERROR");
  }

  const afterDelete = await tweetFind.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, afterDelete, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
