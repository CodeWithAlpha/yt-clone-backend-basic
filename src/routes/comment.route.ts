import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware";
import { postComment } from "../controllers/comment.controller";

const router = Router();

router.route("/post-comment").post(verifyJWT, postComment);

export default router;
