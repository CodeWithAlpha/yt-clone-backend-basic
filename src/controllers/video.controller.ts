import mongoose from "mongoose";
import { Video } from "../models/video.model";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";
import { Request } from "express";
import { IUserDocument } from "../types/user";
import { ApiResponse } from "../utils/apiResponse";
import { User } from "../models/user.model";
import jwt from "jsonwebtoken";
import fs from "fs";
import { logActivity } from "../utils/logger";

const uploadVideo = asyncHandler(async (req, res) => {
  try {
    // Extract fields from request body
    const { title, description, isPublished } = req.body;

    // Validate required fields
    if (!title || !description || !isPublished) {
      throw new Error("All fields are required.");
    }

    // Access uploaded thumbnail path
    const thumbnailLocalPath = await (req.files as any)?.thumbnail[0].path;

    // Ensure thumbnail is uploaded
    if (!thumbnailLocalPath) {
      throw new Error("Thumbnail is required.");
    }

    // Access uploaded video file path
    const videoFileLocalPath = await (req.files as any)?.videoFile[0].path;

    // Ensure video file is uploaded
    if (!videoFileLocalPath) {
      throw new Error("Video file is required.");
    }

    // Upload thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    // Upload video file to Cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);

    // Check if both uploads were successful
    if (!thumbnail || !videoFile) {
      throw new Error("Error while upload.");
    }

    // Create new video document
    const video = await Video.create({
      videoFile: videoFile.url,
      thumbnail: thumbnail.url,
      title,
      description,
      duration: videoFile.duration, // optional: if Cloudinary returns duration
      isPublished,
      owner: String((req as Request & { user: IUserDocument }).user._id),
    });

    // Return success response
    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video upload successfully."));
  } catch (error: any) {
    console.warn(error);
    // Return error response
    return res.status(400).json(new ApiResponse(400, null, error.message));
  } finally {
    fs.unlinkSync((req.files as any)?.thumbnail[0].path);
    fs.unlinkSync((req.files as any)?.videoFile[0].path);
  }
});

const editVideo = asyncHandler(async (req, res) => {
  try {
    // Get video ID from route parameters
    const { id } = req.params;

    // Get updated fields from request body
    const { title, description, isPublished } = req.body;

    // Find the video by ID
    const existingVideo = await Video.findById(id);

    // Check if video exists
    if (!existingVideo) {
      throw new Error("Video does not exist");
    }

    // Log uploaded file for debugging (optional)
    console.log(req.file);

    // Get uploaded thumbnail path
    const thumbnailLocalPath = await (req.file as any)?.path;

    // Check if thumbnail path is present
    if (!thumbnailLocalPath) {
      throw new Error("Error while uploading thumbnail");
    }

    // Upload thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    // Ensure thumbnail upload succeeded
    if (!thumbnail) {
      throw new Error("Error while uploading thumbnail");
    }

    // Update video fields
    existingVideo.title = title;
    existingVideo.description = description;
    existingVideo.isPublished = isPublished;
    existingVideo.thumbnail = thumbnail.url;

    // Save updated video
    const video = await existingVideo.save();

    // Return success response
    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video updated successfully"));
  } catch (error: any) {
    console.warn(error);
    // Return error response
    return res.status(400).json(new ApiResponse(400, null, error.message));
  } finally {
    fs.unlinkSync((req.file as any)?.path);
  }
});

const getVideosFeed = asyncHandler(async (req, res) => {
  try {
    // Parse pagination query params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Aggregate published videos with pagination
    const videos = await Video.aggregate([
      {
        // Only published videos
        $match: {
          isPublished: true,
        },
      },
      {
        // Sort newest first
        $sort: { createdAt: -1 },
      },
      {
        // Split data into two facets: metadata & videos
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page, limit } }],
          videos: [{ $skip: skip }, { $limit: limit }],
        },
      },
      {
        // Flatten metadata object
        $addFields: {
          metadata: { $arrayElemAt: ["$metadata", 0] },
        },
      },
      {
        // Format response
        $project: {
          videos: 1,
          count: "$metadata.total",
          page: "$metadata.page",
          limit: "$metadata.limit",
        },
      },
    ]);

    //logger
    await logActivity({
      user: String(
        String((req as Request & { user: IUserDocument })?.user?._id) || ""
      ),
      method: req.method,
      endpoint: req.originalUrl,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Return the response
    return res.status(200).json(new ApiResponse(200, videos[0], "Success"));
  } catch (error: any) {
    console.warn(error);
    return res.status(400).json(new ApiResponse(400, null, error.message));
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

        //logger
        await logActivity({
          user: String(user._id),
          method: req.method,
          endpoint: req.originalUrl,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        });

        await user.save({ validateBeforeSave: false });
      }
    }

    return res.status(200).json(new ApiResponse(200, video, "success"));
  } catch (error: any) {
    console.warn(error);
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const getMyUploadedVideos = asyncHandler(async (req, res) => {
  try {
    const { page, limit, isPublished, title } = req.query;

    // Set default pagination
    const pageSize = parseInt(page as string) || 1;
    const limitSize = parseInt(limit as string) || 10;
    const skip = (pageSize - 1) * limitSize;

    // Build filters dynamically
    const filters: any = {
      owner: String((req as Request & { user: IUserDocument }).user._id),
    };

    if (typeof isPublished !== "undefined") {
      filters.isPublished = isPublished === "true";
    }

    if (typeof title === "string" && title.trim() !== "") {
      filters.title = { $regex: title.trim(), $options: "i" }; // case-insensitive search
    }

    // Run aggregate query with filtering and pagination
    const videos = await Video.aggregate([
      { $match: filters },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [
            { $count: "total" },
            { $addFields: { page: pageSize, limit: limitSize } },
          ],
          videos: [{ $skip: skip }, { $limit: limitSize }],
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
          page: "$metadata.page",
          limit: "$metadata.limit",
          total: "$metadata.total",
        },
      },
    ]);

    return res.status(200).json(new ApiResponse(200, videos[0], "Success"));
  } catch (error: any) {
    console.warn(error);
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

export {
  uploadVideo,
  editVideo,
  getVideosFeed,
  getVideoById,
  getMyUploadedVideos,
};
