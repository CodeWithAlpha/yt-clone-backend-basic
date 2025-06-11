import { Request } from "express";
import { Comment } from "../models/comment.model";
import { Video } from "../models/video.model";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { Like } from "../models/likes.model";

const createLike = async ({
  commentId,
  videoId,
  userId,
}: {
  commentId?: string;
  videoId: string;
  userId: string;
}) => {
  // Optional: prevent duplicate like

  const payload: any = {
    video: videoId,
    likedBy: userId,
  };

  if (commentId) {
    payload.comment = commentId; // only add if it exists and is valid
  }

  const alreadyLiked = await Like.findOne(payload);

  if (alreadyLiked) return { alreadyLiked: true, like: alreadyLiked };

  const like = await Like.create(payload);

  return { alreadyLiked: false, like };
};

const postLikeVideo = asyncHandler(async (req, res) => {
  const { videoId, isLike } = req.body;
  const userId = (req as Request & { user: IUserDocument }).user._id as string;

  if (!videoId) throw new ApiError(400, "Video ID is required.");
  if (isLike == null) throw new ApiError(400, "Like or dislike is required.");

  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) throw new ApiError(404, "Video not found.");

  const isAlreadyExist = await Like.findOne({
    $and: [{ likeType: "video" }, { video: videoId }, { likedBy: userId }],
  });

  if (isAlreadyExist) {
    if (isAlreadyExist.isLike == isLike) {
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

    isAlreadyExist.isLike = isLike;
    const updatedLike = await isAlreadyExist.save({});

    return res.status(200).json(new ApiResponse(200, updatedLike, `success.`));
  }

  const likedVideo = await Like.create({
    likeType: "video",
    isLike,
    video: videoId,
    likedBy: userId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideo, "Video liked successfully."));
});

const postLikeTheComment = asyncHandler(async (req, res) => {
  const { commentId, videoId, isLike } = req.body;
  const userId = (req as Request & { user: IUserDocument }).user._id as string;

  if (!videoId || !commentId || isLike == null)
    throw new ApiError(400, "All fields are required.");

  const videoExists = await Video.exists({ _id: videoId });
  if (!videoExists) throw new ApiError(404, "Video not found.");

  const isAlreadyExist = await Like.findOne({
    $and: [
      { likeType: "comment" },
      { video: videoId },
      { likedBy: userId },
      { comment: commentId },
    ],
  });

  if (isAlreadyExist) {
    if (isAlreadyExist.isLike == isLike) {
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
    isAlreadyExist.isLike = isLike;
    const updatedLike = await isAlreadyExist.save({});

    return res.status(200).json(new ApiResponse(200, updatedLike, "success."));
  }

  const likedVideo = await Like.create({
    likeType: "comment",
    isLike,
    video: videoId,
    likedBy: userId,
    comment: commentId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideo, "Comment liked successfully."));
});

const getVideoLikes = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const likes = await Like.aggregate([
    {
      $match: { videoId },
    },
  ]);

  console.log(likes);
});

export { postLikeVideo, postLikeTheComment, getVideoLikes };
