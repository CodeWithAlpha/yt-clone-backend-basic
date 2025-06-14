import { Request } from "express";
import { Subscription } from "../models/subscription.model";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { User } from "../models/user.model";

const subscribeChannel = asyncHandler(async (req, res) => {
  try {
    // Get channel ID from route params
    const { channelid } = req.params;

    // Validate channel ID presence
    if (!channelid) {
      throw new Error("Invalid channel");
    }

    // Get currently logged-in user's ID
    const subscriberId = (req as Request & { user: IUserDocument }).user._id;

    // Check if the user is already subscribed to the channel
    const existingSubscription = await Subscription.findOne({
      channel: channelid,
      subscriber: subscriberId,
    });

    // If already subscribed, then unsubscribe (toggle behavior)
    if (existingSubscription) {
      await Subscription.deleteOne({ _id: existingSubscription._id });
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Unsubscribed successfully"));
    }

    // Check if the channel (user) actually exists
    const channelExists = await User.exists({ _id: channelid });
    if (!channelExists) {
      throw new Error("Channel not found");
    }

    // Create a new subscription if not already subscribed
    await Subscription.create({
      channel: channelid,
      subscriber: subscriberId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Subscribed successfully"));
  } catch (error: any) {
    console.warn(error);
    // Catch any validation or server error
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

export { subscribeChannel };
