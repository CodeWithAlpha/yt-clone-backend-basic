import mongoose, { Model, Schema } from "mongoose";
import { ILike } from "../types/like";

const likeSchema = new Schema<ILike>(
  {
    likeType: {
      type: String,
      required: true,
    },
    isLike: {
      type: Boolean || null,
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
    },
  },
  { timestamps: true }
);

likeSchema.pre("validate", function (next) {
  if (!this.video && !this.comment) {
    next(
      new Error("Like must be associated with either a video or a comment.")
    );
  } else {
    next();
  }
});

export const Like: Model<ILike> = mongoose.model<ILike>("Like", likeSchema);
