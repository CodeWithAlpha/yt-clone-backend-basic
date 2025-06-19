import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  getLikedVideos,
  postLikeTheComment,
  postLikeVideo,
} from "../controllers/like.controller";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/like-comment").post(verifyJWT, logRequest, postLikeTheComment);
router.route("/like-video").post(verifyJWT, logRequest, postLikeVideo);
router.route("/my-liked-video").get(verifyJWT, logRequest, getLikedVideos);

export default router;
