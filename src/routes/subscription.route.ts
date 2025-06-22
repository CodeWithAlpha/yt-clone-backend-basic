import { Router } from "express";
import {
  mySubscribed,
  mySubscribers,
  subscribeChannel,
} from "../controllers/subscription.controller";
import { verifyJWT } from "../middlewares/auth.middleware";
import { logRequest } from "../middlewares/activity.middleware";

const router = Router();

router.route("/my-subscribers").get(verifyJWT, logRequest, mySubscribers);
router.route("/my-subscribed").get(verifyJWT, logRequest, mySubscribed);
router.route("/:channelid").get(verifyJWT, logRequest, subscribeChannel);

export default router;
