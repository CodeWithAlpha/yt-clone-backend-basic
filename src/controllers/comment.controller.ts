import { Request } from "express";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";

const postComment = asyncHandler(async (req, res) => {
  try {
    // Extracting comment and videoId from request body
    const { comment, videoId } = req.body;

    // Input validation - both fields must be provided
    if (!comment || !videoId) {
      throw new Error("All fields are required.");
    }

    // Fetching video by its ID to ensure it exists
    const video = await Video.findById({ _id: videoId });

    // If no video found, throw an error
    if (!video) throw new Error("Video not found.");

    // Creating the comment document in the database
    const postedComment = await Comment.create({
      content: comment.trim(), // trimming extra spaces
      video: videoId, // reference to the video
      owner: (req as Request & { user: IUserDocument }).user._id, // user ID from authenticated request
    });

    // Sending success response with 201 status and the created comment
    return res
      .status(201)
      .json(new ApiResponse(201, postedComment, "Comment Post Successfully."));
  } catch (error: any) {
    // Handling any error and sending a 400 Bad Request with the error message
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

export { postComment };
