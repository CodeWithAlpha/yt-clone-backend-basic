import mongoose, { Model, Schema } from "mongoose";
import { ILike } from "../types/like";
import { IComment } from "../types/comment";

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Comment: Model<IComment> = mongoose.model<IComment>(
  "Comment",
  commentSchema
);
