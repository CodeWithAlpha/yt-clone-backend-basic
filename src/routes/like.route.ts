import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  postLikeTheComment,
  postLikeVideo,
} from "../controllers/like.controller";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/like-comment").post(verifyJWT, logRequest, postLikeTheComment);
router.route("/like-video").post(verifyJWT, logRequest, postLikeVideo);

export default router;
