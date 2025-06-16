import mongoose, { Model, Schema } from "mongoose";
import { IActivity } from "../types/activity";

const activitySchema = new Schema<IActivity>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    method: {
      type: String,
    },
    endpoint: {
      type: String,
    },
    message: {
      type: String,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  { timestamps: true }
);

export const Activity: Model<IActivity> = mongoose.model<IActivity>(
  "Activity",
  activitySchema
);
