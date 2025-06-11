import mongoose, { Schema, Model } from "mongoose";
import { ISubscribe } from "../types/subscription";

const subscriptionSchema = new Schema<ISubscribe>(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription: Model<ISubscribe> = mongoose.model<ISubscribe>(
  "Subscription",
  subscriptionSchema
);
