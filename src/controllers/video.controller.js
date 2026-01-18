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

  const pipeline = [];

  
  const matchStage = { isPublished: true };
  if (userId) {
    matchStage.owner = new mongoose.Types.ObjectId(userId);
  }
  pipeline.push({ $match: matchStage });

 
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
    },
  });
  pipeline.push({ $unwind: "$owner" });

 
  pipeline.push({
    $lookup: {
      from: "likes",
      localField: "_id",
      foreignField: "video",
      as: "likes"
    }
  });

  pipeline.push({
    $addFields: {
      likesCount: { $size: "$likes" }
    }
  });

 
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
          { "owner.username": { $regex: query, $options: "i" } },
        ],
      },
    });
  }

 
  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      "owner.username": 1,
      "owner.fullName": 1,
      "owner.avatar": 1,
      thumbnail: 1,
      duration: 1,
      views: 1,
      likesCount: 1,
      videoFile: 1,
      createdAt: 1,
    },
  });

  
  pipeline.push({
    $sort: {
      [sortBy || "createdAt"]: sortType === "asc" ? 1 : -1,
    },
  });

  const videos = await Video.aggregatePaginate(Video.aggregate(pipeline), {
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

  const pipeline = [
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
        isPublished: true
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1
            }
          }
        ]
      }
    },
    {
      $unwind: "$owner"
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes"
      }
    },
    {
      $lookup: {
        from: "subscriptions",
        let: { ownerId: "$owner._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$channel", "$$ownerId"] },
                  { $eq: ["$subscriber", req.user._id] }
                ]
              }
            }
          }
        ],
        as: "isSubscribed"
      }
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLiked: {
          $cond: {
            if: { $in: [req.user._id, "$likes.likedBy"] },
            then: true,
            else: false
          }
        },
        isSubscribed: {
          $cond: {
            if: { $gt: [{ $size: "$isSubscribed" }, 0] },
            then: true,
            else: false
          }
        }
      }
    },
    {
      $project: {
        likes: 0
      }
    }
  ];

  const videos = await Video.aggregate(pipeline);

  if (!videos?.length) {
    throw new ApiError(404, "Video not found or inactive");
  }

  const video = videos[0];

 
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { watchHistory: videoId }
    });
    await User.findByIdAndUpdate(req.user._id, {
      $push: { watchHistory: videoId }
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
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

  console.log("updateVideo payload:", req.body);
  console.log("updateVideo file:", req.file);

  const { title, description } = req.body;
  const thumbnailImgPath = req.file?.path;

  if (!title && !description && !thumbnailImgPath) {
    throw new ApiError(400, "Title or description or thumbnail is required");
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

  
  if (title && title.trim() !== "") {
    video.title = title;
  }
  if (description && description.trim() !== "") {
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

const incrementView = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.isPublished) {
    throw new ApiError(400, "Video is not published");
  }

  video.views += 1;
  await video.save({ validateBeforeSave: false });

 
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { watchHistory: videoId },
    });
    await User.findByIdAndUpdate(req.user._id, {
      $push: { watchHistory: videoId },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { views: video.views }, "View count incremented"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  incrementView,
};
