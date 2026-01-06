import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  //TODO: create playlist

  if (!name?.trim()) {
    throw new ApiError(400, "name of playlist is missing");
  }
  if (!description?.trim()) {
    throw new ApiError(400, "description of playlist is missing");
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
    videos: [],
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "userId is incorrect");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "user is not present");
  }

  const playlist = await Playlist.find({ owner: userId })
    .populate("videos")
    .populate("owner", "username fullName");

  return res
    .status(200) 
    .json(
      new ApiResponse(200, playlist, "All User Playlist fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlistId is incorrect");
  }

  const playlist = await Playlist.findById(playlistId)
    .populate("videos")
    .populate("owner", "username fullName");

  if (!playlist) {
    throw new ApiError(400, "user is not present");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is incorrect");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video id is incorrect");
  }

  const video = await Video.findById(videoId);
  const playlist = await Playlist.findById(playlistId);

  if (!video || !playlist) {
    throw new ApiError(400, "Video and Playlist is mandatory");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "owner Id mismatched");
  }

  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in your playlist");
  }

  playlist.videos.push(videoId);

  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is incorrect");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video id is incorrect");
  }

  const video = await Video.findById(videoId);
  const playlist = await Playlist.findById(playlistId);

  if (!video || !playlist) {
    throw new ApiError(400, "Video and Playlist is mandatory");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "owner Id mismatched");
  }

  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video does not exists in your playlist");
  }

  playlist.videos.pull(videoId);

  await playlist.save();

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is incorrect");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "playlist does not exist");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "owner Id mismatched");
  }

  await Playlist.findByIdAndDelete(playlistId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "video added to playlist successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "playlist Id is incorrect");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(400, "playlist does not exist");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "owner Id mismatched");
  }

  if (!name?.trim() && !description?.trim()) {
    throw new ApiError(400, "name or description is not present");
  }

  if (name?.trim()) {
    playlist.name = name;
  }

  if (description?.trim()) {
    playlist.description = description;
  }

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, " playlist updated successfully"));
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
