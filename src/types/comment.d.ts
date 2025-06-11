import mongoose, { Document } from "mongoose";
import { IVideo } from "./video";

export interface IComment extends Document {
  content: string;
  video: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
}
