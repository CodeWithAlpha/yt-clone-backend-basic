import mongoose, { Document } from "mongoose";
import { IVideo } from "./video";

export interface ILike extends Document {
  likeType: "comment" | "video";
  isLike: boolean | null;
  comment: mongoose.Types.ObjectId;
  likedBy: mongoose.Types.ObjectId;
  video: mongoose.Types.ObjectId;
}
