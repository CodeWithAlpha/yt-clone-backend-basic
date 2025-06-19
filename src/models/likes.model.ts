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

likeSchema.pre("validate", function (next) {
  const isVideoLike = this.likeType === "video";
  const isCommentLike = this.likeType === "comment";

  if (isVideoLike && !this.video) {
    return next(new Error("Video ID is required for video like."));
  }

  if (isCommentLike && !this.comment) {
    return next(new Error("Comment ID is required for comment like."));
  }

  if (this.video && this.comment) {
    return next(new Error("A like can only be for a video or a comment, not both."));
  }

  next();
});


export const Like: Model<ILike> = mongoose.model<ILike>("Like", likeSchema);
