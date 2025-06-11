import { Router } from "express";
import {
  changeCurrentPassword,
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
router.route("/logout").get(verifyJWT, logoutUser);
router.route("/refresh-user").get(refreshUserToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/me").get(verifyJWT, userProfile);
router
  .route("/update-avatar")
  .post(
    upload.fields([{ name: "avatar", maxCount: 1 }]),
    verifyJWT,
    updateAvatar
  );
router
  .route("/update-cover")
  .post(
    verifyJWT,
    upload.fields([{ name: "cover", maxCount: 1 }]),
    updateCover
  );
router.route("/update-user").post(verifyJWT, updateUser);
router.route("/channel/:id").get(verifyJWT, getUserChannelProfile);
router.route("/watch-history").get(verifyJWT, getWatchHistory);

export default router;
