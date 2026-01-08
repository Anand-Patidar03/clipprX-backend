import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const requiredCondition = {
    isPublished: true,
  };

  if (query) {
    requiredCondition.$or = [
      {
        title: { $regex: query, $options: "i" },
      },
      {
        description: { $regex: query, $options: "i" },
      },
    ];
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid userId");
  }
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "user is not defined");
  }

  const video = Video.aggregate([
    {
      $match: requiredCondition,
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
        title: 1,
        description: 1,
        "owner.username": 1,
        "owner.avatar": 1,
        thumbnail: 1,
        duration: 1,
        views: 1,
        videoFile: 1,
      },
    },
    {
      $sort: {
        [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const videos = await Video.aggregatePaginate(video, {
    page: Number(page),
    limit: Number(limit),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (title.trim() === "" || description.trim() === "") {
    throw new ApiError(400, "Title and description both are required");
  }

  const videoFilePath = req.files?.videoFile[0]?.path;
  const thumbnailImgPath = req.files?.thumbnail[0]?.path;

  if (!videoFilePath && !thumbnailImgPath) {
    throw new ApiError(400, "Video and Thumbnail are mandatory");
  }

  const thumbnailUpload = await uploadOnCloudinary(thumbnailImgPath);
  const videoUpload = await uploadOnCloudinary(videoFilePath);

  if (!thumbnailUpload?.secure_url) {
    throw new ApiError(400, "Error while uploading thumbnail to cloudinary");
  }
  if (!videoUpload?.secure_url) {
    throw new ApiError(400, "Error while uploading video to cloudinary");
  }

  const video = await Video.create({
    title,
    description,
    duration: videoUpload.duration || 0,
    views: 0,
    isPublished: true,
    owner: req.user?._id,
    videoFile: videoUpload.secure_url,
    thumbnail: thumbnailUpload.secure_url,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "username avatar"
  );

  if (!video) {
    throw new ApiError(400, "Video does not found");
  }

  if (!video.isPublished) {
    throw new ApiError(400, "Video does not published yet");
  }

  if (video.owner._id.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Video owner mismatched");
  }

  video.views += 1;

  await video.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video got successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video owner not found");
  }

  const title = req.body.title;
  const description = req.body.description;
  const thumbnailImgPath = req.files?.thumbnail[0]?.path;

  if (!title && !description && !thumbnailImgPath) {
    throw new ApiError(400, "Title or description anyone has to be changed");
  }

  if (video.owner?._id.toString() !== req.user?._id.toString()) {
    throw new ApiError(400, "Video owner mismatched");
  }

  if (thumbnailImgPath) {
    const oldPublicId = video.thumbnail.split("/").pop().split(".")[0];
    await deleteFromCloudinary(oldPublicId);
    const newThumbUpload = await uploadOnCloudinary(thumbnailImgPath);
    if (!newThumbUpload?.secure_url) {
      throw new ApiError(400, "Error while uploading thumbnail");
    }

    video.thumbnail = newThumbUpload.secure_url;
  }

  if (title.trim() !== "") {
    video.title = title;
  }
  if (description.trim() !== "") {
    video.description = description;
  }

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "VideoId is not correct");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video is not there");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "Video owner mismatched");
  }

  const oldThumbnail = video.thumbnail.split("/").pop().split(".")[0];
  await deleteFromCloudinary(oldThumbnail);
  const oldVideo = video.videoFile.split("/").pop().split(".")[0];
  await deleteFromCloudinary(oldVideo);

  await Video.findByIdAndDelete(video._id);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "VideoId is not correct");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(400, "Video is not there");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "Video owner mismatched");
  }

  video.isPublished = !video.isPublished;

  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Toggelled publish status"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
