import { Router } from "express";
import { subscribeChannel } from "../controllers/subscription.controller";
import { verifyJWT } from "../middlewares/auth.middleware";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/:channelid").get(verifyJWT, logRequest, subscribeChannel);

export default router;
