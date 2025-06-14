import mongoose, { Model, Schema } from "mongoose";
import { IVideo } from "../types/video";

const videoSchema = new Schema<IVideo>(
  {
    videoFile: {
      type: String,
      required: true,
    },
    thumbnail: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    duration: {
      type: Number,
      required: true,
      min: [1, "Duration must be greater than 0"],
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Optional: index for text search
videoSchema.index({ title: "text", description: "text" });

export const Video: Model<IVideo> = mongoose.model<IVideo>(
  "Video",
  videoSchema
);
