import { Router } from "express";
import {
  changeCurrentPassword,
  getActivity,
  getUserChannelProfile,
  getWatchHistory,
  loginUser,
  logoutUser,
  refreshUserToken,
  registerUser,
  updateAvatar,
  updateCover,
  updateUser,
  userProfile,
} from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "cover",
      maxCount: 1,
    },
  ]),
  registerUser
);
router.route("/login").post(loginUser);
router.route("/logout").get(verifyJWT, logRequest, logoutUser);
router.route("/refresh-user").get(refreshUserToken);
router
  .route("/change-password")
  .post(verifyJWT, logRequest, changeCurrentPassword);
router.route("/me").get(verifyJWT, logRequest, userProfile);
router
  .route("/update-avatar")
  .post(
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    verifyJWT,
    logRequest,
    updateAvatar
  );
router
  .route("/update-cover")
  .post(
    verifyJWT,
    upload.fields([{ name: "cover", maxCount: 1 }]),
    logRequest,
    updateCover
  );
router.route("/update-user").post(verifyJWT, logRequest, updateUser);
router.route("/channel/:id").get(verifyJWT, logRequest, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, logRequest, getWatchHistory);
router.route("/get-activity").get(verifyJWT, getActivity);

export default router;
