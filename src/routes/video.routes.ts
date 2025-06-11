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
  uploadVideo
);
router
  .route("/edit-video/:id")
  .post(verifyJWT, upload.single("thumbnail"), editVideo);
router.route("/video-feeds").get(getVideosFeed);
router.route("/video/:id").get(getVideoById);
router.route("/my-videos").get(verifyJWT, getMyUploadedVideos);

export default router;
