import { Document } from "mongoose";

export interface IUserDocument extends Document {
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  cover: string;
  watchHistory: any[];
  password: string;
  refreshToken: string;
  isPasswordCorrect: (password: string) => Promise<boolean>;
  generateRefreshToken: () => Promise<string>;
  generateAccessToken: () => Promise<string>;
}
