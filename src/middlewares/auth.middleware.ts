import { NextFunction, Request } from "express";
import { User } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { IUserDocument } from "../types/user";
import { accessTokenJwtPayload } from "../types/jwt";

export const verifyJWT = asyncHandler(
  async (req: Request, _, next: NextFunction) => {
    //find token
    try {
      const token =
        req.cookies?.accessToken ||
        req.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(410, "Unathorized Request");
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
        throw new ApiError(400, "Invalid User");
      }

      // add user object to request body
      (req as Request & { user: IUserDocument }).user = existedUser;

      next();
    } catch (error) {
      throw new ApiError(422, "Error while validate user.");
    }
  }
);
