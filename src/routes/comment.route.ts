import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { postComment } from "../controllers/comment.controller";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/post-comment").post(verifyJWT, logRequest, postComment);

export default router;
