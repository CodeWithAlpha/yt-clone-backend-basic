import { Request } from "express";
import { Video } from "../models/video.model";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { Like } from "../models/likes.model";
import mongoose from "mongoose";

const postLikeVideo = asyncHandler(async (req, res) => {
  try {
    // Destructure videoId and isLike from request body
    const { videoId, isLike } = req.body;

    // Extract user ID from authenticated request
    const userId = (req as Request & { user: IUserDocument }).user
      ._id as string;

    // Validate: videoId must be present
    if (!videoId) throw new Error("Video ID is required.");

    // Validate: isLike must not be null or undefined (both true and false are valid)
    if (isLike == null) throw new Error("Like or dislike is required.");

    // Check if video with the given ID exists
    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) throw new Error("Video not found.");

    // Check if the user has already liked/disliked this video
    const isAlreadyExist = await Like.findOne({
      $and: [
        { likeType: "video" }, // like type filter
        { video: videoId }, // same video
        { likedBy: userId }, // by same user
      ],
    });

    // If like/dislike already exists
    if (isAlreadyExist) {
      // If the like/dislike state is the same, return early with message
      if (isAlreadyExist.isLike === isLike) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              isAlreadyExist,
              `Already ${isLike ? "liked" : "disliked"} the video.`
            )
          );
      }

      // Else, update the isLike field
      isAlreadyExist.isLike = isLike;
      const updatedLike = await isAlreadyExist.save();

      return res
        .status(200)
        .json(new ApiResponse(200, updatedLike, `Success.`));
    }

    // If no previous like/dislike, create a new one
    const likedVideo = await Like.create({
      likeType: "video",
      isLike,
      video: videoId,
      likedBy: userId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, likedVideo, "Video liked successfully."));
  } catch (error: any) {
    console.warn(error);
    // Catch and return error as a 400 Bad Request
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const postLikeTheComment = asyncHandler(async (req, res) => {
  try {
    // Extract required fields from request body
    const { commentId, videoId, isLike } = req.body;

    // Extract authenticated user ID
    const userId = (req as Request & { user: IUserDocument }).user
      ._id as string;

    // Validate all required fields are present
    if (!videoId || !commentId || isLike == null)
      throw new Error("All fields are required.");

    // Check if the associated video exists
    const videoExists = await Video.exists({ _id: videoId });
    if (!videoExists) throw new Error("Video not found.");

    // Check if the user has already liked/disliked this comment on the video
    const isAlreadyExist = await Like.findOne({
      $and: [
        { likeType: "comment" }, // specify this like is for a comment
        { video: videoId }, // video it belongs to
        { likedBy: userId }, // the user who liked/disliked
        { comment: commentId }, // the comment being liked/disliked
      ],
    });

    // If the like/dislike already exists
    if (isAlreadyExist) {
      // If the like/dislike is the same as the existing one, return early
      if (isAlreadyExist.isLike === isLike) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              400,
              isAlreadyExist,
              `Already ${isLike ? "liked" : "disliked"} the comment.`
            )
          );
      }

      // Else, update the isLike status
      isAlreadyExist.isLike = isLike;
      const updatedLike = await isAlreadyExist.save();

      return res
        .status(200)
        .json(
          new ApiResponse(200, updatedLike, "Comment like status updated.")
        );
    }

    // If no previous like/dislike, create a new one
    const likedComment = await Like.create({
      likeType: "comment",
      isLike,
      video: videoId,
      likedBy: userId,
      comment: commentId,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, likedComment, "Comment liked successfully."));
  } catch (error: any) {
    console.warn(error);
    // Handle any runtime or validation error
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = (req as Request & { user: IUserDocument }).user
      ._id as string;
  const likedVideos = await Like.aggregate([
    {
      $match: { 
        likedBy: new mongoose.Types.ObjectId(String(userId)),
        likeType:'video'
       },
    },
    {
      $lookup:{
        from: 'videos',
        localField: "video",
        foreignField:"_id",
        as: 'video'
      }
    },
    {
      $unwind :{
        path: "$video"
      }
    },
    {
      $project:{
        video: 1
      }
    }
  ]);

  return res
  .status(200)
  .json(new ApiResponse(200, likedVideos, "success."));
});

export { postLikeVideo, postLikeTheComment, getLikedVideos };
