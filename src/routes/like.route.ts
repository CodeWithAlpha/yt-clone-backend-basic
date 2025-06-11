import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import {
  postLikeTheComment,
  postLikeVideo,
} from "../controllers/like.controller";

const router = Router();

router.route("/like-comment").post(verifyJWT, postLikeTheComment);
router.route("/like-video").post(verifyJWT, postLikeVideo);

export default router;
