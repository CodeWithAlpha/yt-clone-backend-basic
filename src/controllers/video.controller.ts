import mongoose from "mongoose";
import { Video } from "../models/video.model";
import { ApiError } from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { Request } from "express";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken";

const uploadVideo = asyncHandler(async (req, res) => {
  try {
    const { title, description, isPublished } = req.body;

    if (!title || !description || !isPublished) {
      throw new ApiError(400, "All fields are required.");
    }

    const thumbnailLocalPath = await (req.files as any)?.thumbnail[0].path;

    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Thumbnail is required.");
    }

    const videoFileLocalPath = await (req.files as any)?.videoFile[0].path;

    if (!videoFileLocalPath) {
      throw new ApiError(400, "Video file is required.");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    if (!thumbnail || !videoFile) {
      throw new ApiError(400, "Error while upload.");
    }

    const video = await Video.create({
      videoFile: videoFile.url,
      thumbnail: thumbnail.url,
      title,
      description,
      duration: videoFile.duration,
      isPublished,
      owner: new mongoose.Types.ObjectId(
        String((req as Request & { user: IUserDocument }).user._id)
      ),
    });

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video upload successfully."));
  } catch (error) {
    throw new ApiError(400, error as string);
  }
});

const editVideo = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, isPublished } = req.body;

    const existingVideo = await Video.findById(id);

    if (!existingVideo) {
      throw new ApiError(400, "Video does not exists");
    }

    console.log(req.file);
    const thumbnailLocalPath = await (req.file as any)?.path;

    if (!thumbnailLocalPath) {
      throw new ApiError(400, "Error while upload Thumbnail");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
      throw new ApiError(400, "Error while upload.");
    }

    existingVideo.title = title;
    existingVideo.description = description;
    existingVideo.isPublished = isPublished;
    existingVideo.isPublished = isPublished;
    existingVideo.thumbnail = thumbnail.url;

    const video = await existingVideo.save();

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video update successfully"));
  } catch (error) {
    throw new ApiError(400, error as string);
  }
});

const getVideosFeed = asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const videos = await Video.aggregate([
      {
        $match: {
          isPublished: true,
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page, limit } }],
          videos: [{ $skip: skip }, { $limit: limit }],
        },
      },
      {
        $addFields: {
          metadata: { $arrayElemAt: ["$metadata", 0] },
        },
      },

      {
        $project: {
          videos: 1,
          count: "$metadata.total",
          page: "$metadata.page",
          limit: "$metadata.limit",
        },
      },
    ]);

    return res.status(200).json(new ApiResponse(200, videos, "success"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "comments",
          localField: "_id",
          foreignField: "video",
          as: "comments",
          pipeline: [
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
              },
            },
            {
              $project: {
                _id: 1,
                content: 1,
                totalCommentLike: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          let: {
            videoId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$video", "$$videoId"] },
                    { $eq: ["$likeType", "video"] },
                    { $eq: ["$isLike", true] },
                  ],
                },
              },
            },
          ],
          as: "videolikes",
        },
      },
      {
        $lookup: {
          from: "likes",
          let: {
            videoId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$video", "$$videoId"] },
                    { $eq: ["$likeType", "video"] },
                    { $eq: ["$isLike", false] },
                  ],
                },
              },
            },
          ],
          as: "videoDislikes",
        },
      },
      {
        $addFields: {
          totalVideoLikes: { $size: "$videolikes" },
          totalVideoDislikes: { $size: "$videoDislikes" },
        },
      },
      {
        $project: {
          _id: 1,
          videoFile: 1,
          thumbnail: 1,
          title: 1,
          description: 1,
          duration: 1,
          views: 1,
          owner: 1,
          createdAt: 1,
          totalVideoLikes: 1,
          totalVideoDislikes: 1,
          comments: 1,
        },
      },
    ]);

    const token =
      req.cookies?.accessToken ||
      req.headers?.authorization?.replace("Bearer ", "");

    if (token) {
      const userDecode = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string
      ) as IUserDocument;

      if (userDecode) {
        const user = (await User.findById({
          _id: userDecode._id,
        })) as IUserDocument;

        const updatedWatchHistory = user.watchHistory.filter(
          (item) => String(item) !== id
        );

        updatedWatchHistory.unshift(id);
        user.watchHistory = updatedWatchHistory;

        await user.save({ validateBeforeSave: false });
      }
    }

    return res.status(200).json(new ApiResponse(200, video, "success"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

const getMyUploadedVideos = asyncHandler(async (req, res) => {
  try {
    const { page, limit, isPublished, title } = req.query;

    const pageSize = parseInt(page as string) || 1;
    const limitSize = parseInt(limit as string) || 10;

    const filters: any = {
      owner: new mongoose.Types.ObjectId(
        String((req as Request & { user: IUserDocument }).user._id)
      ),
    };
    if (typeof isPublished !== "undefined") {
      filters.isPublished = isPublished === "true";
    }

    if (typeof title === "string" && title.trim() !== "") {
      filters.title = { $regex: title.trim(), $options: "i" };
    }

    const videos = await Video.aggregate([
      {
        $match: filters,
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [
            { $count: "total" },
            { $addFields: { pageSize, limitSize } },
          ],
          videos: [
            { $skip: (pageSize - 1) * limitSize },
            { $limit: limitSize },
          ],
        },
      },
      {
        $addFields: {
          metadata: {
            $arrayElemAt: ["$metadata", 0],
          },
        },
      },
      {
        $project: {
          videos: 1,
          page: "$metadata.pageSize",
          limit: "$metadata.limitSize",
          total: "$metadata.total",
        },
      },
    ]);

    return res.status(200).json(new ApiResponse(200, videos[0], "success"));
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json(new ApiResponse(500, null, "Internal server error"));
  }
});

export {
  uploadVideo,
  editVideo,
  getVideosFeed,
  getVideoById,
  getMyUploadedVideos,
};
