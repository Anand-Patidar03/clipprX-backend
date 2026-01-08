import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessandRefreshToken = async function (userID) {
  try {
    const user = await User.findById(userID);

    //     console.log("generateAccessandRefreshToken called");
    // console.log("User ID received:", userID);

    //  console.log("User fetched for token generation:", user);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // console.log("ACCESS_SECRET:", process.env.ACCESS_TOKEN_SECRET);
    // console.log("ACCESS_EXP:", process.env.ACCESS_TOKEN_EXPIRY);
    // console.log("REFRESH_SECRET:", process.env.REFRESH_TOKEN_SECRET);
    // console.log("REFRESH_EXP:", process.env.REFRESH_TOKEN_EXPIRY);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //     console.log("Access Token generated:", accessToken ? "YES" : "NO");
    // console.log("Refresh Token generated:", refreshToken ? "YES" : "NO");

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something error occured while generating access and refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password } = req.body;
  // console.log("username :", username);
  // console.log("email :", email);
  // console.log("fullName :", fullName);
  // console.log("password :", password);

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  // console.log("Existed user is :", existedUser);

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // console.log("req.files is :", req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  // console.log("avatarLocalPath :", avatarLocalPath);
  // console.log("coverImageLocalPath :", coverImageLocalPath);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required mandatory");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // console.log("Avatar Cloudinary response :", avatar);
  // console.log("Cover Cloudinary response :", coverImage);

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.secure_url,
    coverImage: coverImage?.secure_url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // console.log("User created :", user);

  const isPresent = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // console.log("User is present :", isPresent);

  if (!isPresent) {
    throw new ApiError(500, "Cannot register due to some problem !!");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, isPresent, "User registered successfully !!"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body -> data
  //username or email
  //find the user
  //password check
  //accesss and refresh token

  const { username, email, password } = req.body;

  // console.log("LOGIN API HIT");
  // console.log("Request body:", req.body);
  // console.log("Username:", username);
  // console.log("Email:", email);
  // console.log("Password received:", password ? "YES" : "NO");

  if (!username && !email) {
    throw new ApiError(400, "username/email is required");
  }

  const isUserThere = await User.findOne({
    $or: [{ email }, { username }],
  });

  // console.log("User found:", isUserThere);

  if (!isUserThere) {
    throw new ApiError(404, "User does not exist");
  }

  const checkpwd = await isUserThere.isPwdCorrect(password);

  // console.log("Password correct:", checkpwd);

  if (!checkpwd) {
    throw new ApiError(401, "Password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshToken(
    isUserThere._id
  );

  // console.log("Access Token generated:", accessToken ? "YES" : "NO");
  // console.log("Refresh Token generated:", refreshToken ? "YES" : "NO");

  const loggedInUser = await User.findById(isUserThere._id).select(
    "-password -refreshToken"
  );

  // console.log("loggedInUser : ", loggedInUser);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User successfully logged in"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  // console.log(" Refresh token from cookies:", req.cookies?.refreshToken);
  // console.log("Refresh token from body:", req.body?.refreshToken);
  // console.log(" Incoming refresh token:", incomingRefreshToken);

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }
  let decodeToken;
  try {
    // console.log("incomingRefreshToken:", incomingRefreshToken);

    decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
  } catch (error) {
    throw new ApiError(401, "Invalid or malformed refresh token");
  }

  // console.log(" Decoded refresh token payload:", decodeToken);

  const user = await User.findById(decodeToken?._id);

  // console.log(" User fetched from DB:", user);

  if (!user) {
    throw new ApiError(401, "refresh token not found it is invalid");
  }

  if (incomingRefreshToken !== user?.refreshToken) {
    throw new ApiError(401, "Refresh Token is expired");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  // console.log("options check : ", options);

  const { accessToken, newRefreshToken } = await generateAccessandRefreshToken(
    user?._id
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken,
        },
        "refresh token now renewed"
      )
    );
});

const chageCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user?._id);

  // console.log("👤 Authenticated user :", req.user);
  // console.log("📦 Password fields received:", {
  //   oldPassword: Boolean(oldPassword),
  //   newPassword: Boolean(newPassword),
  //   confirmPassword: Boolean(confirmPassword),
  // });

  const ispasswordCorrect = await user.isPwdCorrect(oldPassword);

  // console.log("Old password match:", ispasswordCorrect);

  if (!ispasswordCorrect) {
    throw new ApiError(401, "Your old password is invalid");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "new password does not match confirm password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password is changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetail = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!email && !fullName) {
    throw new ApiError(400, "Full name or Email requires");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account detail updated successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  //FOR DELETING THE OLD AVATAR
  const user1 = await User.findById(req.user._id);
  const oldAvatarUrl = user1?.avatar;

  if (!user1) {
    throw new ApiError(404, "User not found");
  }

  if (oldAvatarUrl) {
    const publicId = user1.avatar.split("/").pop().split(".")[0];
    await deleteFromCloudinary(publicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.secure_url) {
    throw new ApiError(400, "Error while uploading the avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.secure_url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover Image file is missing");
  }

  const coverImage = uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.secure_url) {
    throw new ApiError(400, "Error while uploading the coverImage");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.secure_url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is missing here");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedToOther",
      },
    },

    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        subscriberTOCount: {
          $size: "$subscribedToOther",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        subscriberTOCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(400, "Channel does not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fected successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  chageCurrentPassword,
  getCurrentUser,
  updateAccountDetail,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
