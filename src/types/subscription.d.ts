import mongoose, { Document } from "mongoose";
import { IUser } from "../types"; // Assuming this exists

interface ISubscribe extends Document {
  subscriber: mongoose.Types.ObjectId;
  channel: mongoose.Types.ObjectId;
}
