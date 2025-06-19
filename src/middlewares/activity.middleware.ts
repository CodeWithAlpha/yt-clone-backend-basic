// middleware/logRequest.ts
import { NextFunction, Request, Response } from "express";
import { logActivity } from "../utils/logger";
import { IUserDocument } from "../types/user";

export const logRequest = async (
  req: Request,
  _: Response,
  next: NextFunction
) => {
  await logActivity({
    user: String((req as Request & { user: IUserDocument })?.user?._id),
    method: req.method,
    endpoint: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  next();
};
