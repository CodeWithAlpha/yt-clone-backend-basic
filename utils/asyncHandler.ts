import { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
};
