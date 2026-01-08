import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Incorrect video Id ");
  }

  const comment = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
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
      $unwind: "$owner",
    },
    {
      $project: {
        "owner.username": 1,
        "owner.avatar": 1,
        content: 1,
      },
    },
  ]);

  const options = {
    page: Number(page),
    limit: Number(limit),
    sort: { createdAt: -1 },
  };

  const comments = await Comment.aggregatePaginate(comment, options);

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Video comment fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const content = req.body.content;

  console.log("REQ.USER =>", req.user);

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  if (!content || content.trim() === "") {
    throw new ApiError(400, "Comment is missing");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Incorrect video Id ");
  }

  const comment = await Comment.create({
    content,
    owner: req.user?._id,
    video: videoId,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const newContent = req.body.content;

  if (!newContent || newContent.trim() === "") {
    throw new ApiError(400, "New comment is missing");
  }

  const cmtId = await Comment.findById(commentId);

  if (!cmtId) {
    throw new ApiError(400, "Incorrect comment Id");
  }

  if (cmtId.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "mismatched owner");
  }

  cmtId.content = newContent;

  await cmtId.save();

  return res
    .status(200)
    .json(new ApiResponse(200, cmtId, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Comment Id is not valid");
  }

  const cmtId = await Comment.findById(commentId);

  if (cmtId.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "owner mismatched");
  }

  const deleteComment = await cmtId.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, deleteComment, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
