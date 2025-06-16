import { Router } from "express";
import { upload } from "../middlewares/multer.middleware";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  editVideo,
  getMyUploadedVideos,
  getVideoById,
  getVideosFeed,
  uploadVideo,
} from "../controllers/video.controller";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/upload-video").post(
  verifyJWT,
  upload.fields([
    {
      name: "thumbnail",
      maxCount: 1,
    },
    {
      name: "videoFile",
      maxCount: 1,
    },
  ]),
  logRequest,
  uploadVideo
);
router
  .route("/edit-video/:id")
  .post(verifyJWT, upload.single("thumbnail"), logRequest, editVideo);
router.route("/video-feeds").get(getVideosFeed);
router.route("/video/:id").get(getVideoById);
router.route("/my-videos").get(verifyJWT, logRequest, getMyUploadedVideos);

export default router;
