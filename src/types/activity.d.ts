import { Document } from "mongoose";

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;
  method: string;
  message: string;
  ip: string;
  userAgent: string;
  endpoint: string;
}
