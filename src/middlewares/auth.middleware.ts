import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { IUserDocument } from "../types/user";
import { accessTokenJwtPayload } from "../types/jwt";
import { ApiResponse } from "../utils/apiResponse";

export const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    //find token
    try {
      const token =
        req.cookies?.accessToken ||
        req.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        throw new Error("Unathorized Request");
      }

      //decode token
      const decodeToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as accessTokenJwtPayload;

      // find user in DB
      const existedUser = await User.findById({ _id: decodeToken._id }).select(
        "-password -refreshToken"
      );
      if (!existedUser) {
        throw new Error("Invalid User");
      }

      // add user object to request body
      (req as Request & { user: IUserDocument }).user = existedUser;

      next();
    } catch (error: any) {
      return res.status(400).json(new ApiResponse(400, null, error.message));
    }
  }
);
