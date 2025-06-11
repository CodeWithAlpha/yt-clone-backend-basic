import { Router } from "express";
import { subscribeChannel } from "../controllers/subscription.controller";
import { verifyJWT } from "../middlewares/auth.middleware";

const router = Router();

router.route("/:channelid").get(verifyJWT, subscribeChannel);

export default router;
