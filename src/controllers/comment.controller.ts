import { Request } from "express";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import mongoose from "mongoose";

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
    console.warn(error);
    // Handling any error and sending a 400 Bad Request with the error message
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              _id: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$comment", "$$commentId"] },
                  { $eq: ["$likeType", "comment"] },
                ],
              },
            },
          },
        ],
        as: "commentlikes",
      },
    },
    {
      $addFields: {
        totalCommentLike: {
          $size: "$commentlikes",
        },
        owner: { $arrayElemAt: ["$owner", 0] },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        owner: 1,
        updatedAt: 1,
        totalCommentLike: 1,
      },
    },
  ]);

  return res.status(200).json(new ApiResponse(200, comments, "success"));
});

export { postComment, getComments };
