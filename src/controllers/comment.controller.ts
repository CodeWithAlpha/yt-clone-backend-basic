import { Request } from "express";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";

const postComment = asyncHandler(async (req, res) => {
  try {
    const { comment, videoId } = req.body;

    if (!comment && !videoId) {
      throw new ApiError(400, "All fields are required.");
    }

    const video = await Video.findById({ _id: videoId });

    if (!video) {
      throw new ApiError(400, "Video not found.");
    }

    const postedComment = await Comment.create({
      content: comment.trim(),
      video: videoId,
      owner: (req as Request & { user: IUserDocument }).user._id,
    });

    return res
      .status(201)
      .json(new ApiResponse(200, postedComment, "Comment Post Successfully."));
  } catch (error) {
    console.log(error);
    return res
      .status(400)
      .json(new ApiResponse(400, null, "Failed to post comment."));
  }
});

export { postComment };
