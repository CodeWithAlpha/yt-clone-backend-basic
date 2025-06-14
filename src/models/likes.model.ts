import mongoose, { Model, Schema } from "mongoose";
import { ILike } from "../types/like";

const likeSchema = new Schema<ILike>(
  {
    likeType: {
      type: String,
      enum: ["video", "comment"],
      required: true,
    },
    isLike: {
      type: Boolean,
      default: null,
    },
    comment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Like: Model<ILike> = mongoose.model<ILike>("Like", likeSchema);
