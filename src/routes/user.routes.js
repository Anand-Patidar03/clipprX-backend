import { Router } from "express";
import {
  loginUser,
  registerUser,
  logoutUser,
  refreshAccessToken,
  chageCurrentPassword,
  getCurrentUser,
  updateAccountDetail,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

// router.route("/register").post(
//     upload.fields([
//         {
//             name : "avatar",
//             maxCount : 1
//         },
//         {
//             name : "coverImage",
//             maxCount : 1
//         }
//     ]),
//     registerUser
// )

router.route("/register").post(
  (req, res, next) => {
    console.log("Before multer");
    next();
  },
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  (req, res, next) => {
    console.log("After multer, files:", req.files);
    next();
  },
  registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").post(verifyJWT, logoutUser);

router.route("/refresh_token").post(refreshAccessToken);

router.route("/change-password").post(verifyJWT, chageCurrentPassword);

router.route("/current-user").post(verifyJWT,getCurrentUser);

router.route("/account-detail").patch(verifyJWT,updateAccountDetail);

router.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateAvatar)

router.route("/cover-image").patch(verifyJWT,upload.single("coverImage"),updateCoverImage)

router.route("/channel/:username").post(verifyJWT,getUserChannelProfile);

router.route("/watch-history").post(verifyJWT,getWatchHistory);

export default router;
