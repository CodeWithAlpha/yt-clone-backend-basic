import mongoose, { Model, Schema } from "mongoose";
import { IComment } from "../types/comment";

const commentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export const Comment: Model<IComment> = mongoose.model<IComment>(
  "Comment",
  commentSchema
);
