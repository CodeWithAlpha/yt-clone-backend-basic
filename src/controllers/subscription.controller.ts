import { Request } from "express";
import { Subscription } from "../models/subscription.model";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { User } from "../models/user.model";
import mongoose from "mongoose";

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

const mySubscribers = asyncHandler(async (req, res) => {
  try {
    const userId = (req as Request & { user: IUserDocument }).user._id;

    const subscribers = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(userId as string),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                email: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          subscriber: { $arrayElemAt: ["$subscriber", 0] },
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, subscribers, "Subscribers found."));
  } catch (error: any) {
    console.warn(error);
    // Catch any validation or server error
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const mySubscribed = asyncHandler(async (req, res) => {
  try {
    const userId = (req as Request & { user: IUserDocument }).user._id;

    const channel = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(userId as string),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channel",
          pipeline: [
            {
              $project: {
                _id: 1,
                username: 1,
                email: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $addFields: {
          channel: { $arrayElemAt: ["$channel", 0] },
        },
      },
    ]);

    return res
      .status(200)
      .json(new ApiResponse(200, channel, "Subscribers found."));
  } catch (error: any) {
    console.warn(error);
    // Catch any validation or server error
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

export { subscribeChannel, mySubscribers, mySubscribed };
