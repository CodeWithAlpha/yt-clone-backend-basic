import { Request } from "express";
import { Subscription } from "../models/subscription.model";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { User } from "../models/user.model";
import mongoose from "mongoose";

const subscribeChannel = asyncHandler(async (req, res) => {
  try {
    const { channelid } = req.params;

    if (!channelid) {
      throw new ApiError(400, "Invalid channel");
    }

    const subscriberId = (req as Request & { user: IUserDocument }).user._id;

    const existingSubscription = await Subscription.findOne({
      channel: channelid,
      subscriber: subscriberId,
    });

    if (existingSubscription) {
      await Subscription.deleteOne({ _id: existingSubscription._id });
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Unsubscribed Successfully"));
    }

    const channelExists = await User.exists({ _id: channelid });
    if (!channelExists) {
      throw new ApiError(404, "Channel not found");
    }

    await Subscription.create({
      channel: channelid,
      subscriber: subscriberId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Subscribed Successfully"));
  } catch (error) {
    throw new ApiError(400, (error as Error).message);
  }
});

export { subscribeChannel };
