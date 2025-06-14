import { Request } from "express";
import { User } from "../models/user.model";
import { ApiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";
import jwt from "jsonwebtoken";
import { IUserDocument } from "../types/user";
import { refreshTokenJwtPayload } from "../types/jwt";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  try {
    // Extract required fields from request body
    const { username, email, fullname, password } = req.body;

    // Check if any required field is missing or empty
    if (
      [username, email, fullname, password].some((fields) => fields.trim === "")
    ) {
      throw new Error("All fields are required.");
    }

    // Check if a user already exists with same username or email
    const isUserExists = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (isUserExists) throw new Error("User Already Exists.");

    // Extract avatar and cover image paths from uploaded files
    const avatarLocalPath = (req.files as any)?.avatar[0].path;
    const coverLocalPath =
      !!req.files?.length && (req.files as any)?.cover[0].path;

    // Avatar is mandatory
    if (!avatarLocalPath) throw new Error("Avatar field is required.");

    // Upload avatar to Cloudinary (or other cloud storage)
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Upload cover image only if provided
    const cover = coverLocalPath
      ? await uploadOnCloudinary(coverLocalPath)
      : { url: "" };

    if (!avatar) throw new Error("Avatar is required.");

    // Create new user in the database
    const user = await User.create({
      username: username.trim().toLowerCase(),
      email,
      fullname,
      password,
      avatar: avatar?.url,
      cover: cover?.url || "",
    });

    // Fetch the created user without sensitive fields
    const createdUser = await User.findById({ _id: user._id }).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new Error("Something went wrong while Register the user.");
    }

    // Return the successful response
    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User Created Successfully."));
  } catch (error: any) {
    return res.status(400).json(new ApiResponse(400, null, error?.message));
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // 🔍 Validate required fields
    if ((!username && !email) || !password) {
      throw new Error("All fields are required.");
    }

    // 🔐 Find user by either username or email
    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!existedUser) {
      throw new Error("User does not exist.");
    }

    // 🔑 Validate password
    const isPasswordValid = await existedUser.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw new Error("Please enter a valid password.");
    }

    // 🎟 Generate tokens
    const accessToken = await existedUser.generateAccessToken();
    const refreshToken = await existedUser.generateRefreshToken();

    // 💾 Store refresh token in DB
    existedUser.refreshToken = refreshToken;

    // 🧾 Save user without running validations again
    const updatedUser = await existedUser.save({ validateBeforeSave: false });

    // 🍪 Cookie options
    const options = {
      httpOnly: true, // prevents access from JS
      secure: true, // ensures HTTPS only (turn off in dev if needed)
    };

    // ✅ Send tokens in cookies and response
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            userId: updatedUser._id,
            accessToken,
            refreshToken,
          },
          "User logged in successfully."
        )
      );
  } catch (error: any) {
    // ❌ Return error response
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
    // Clear the refresh token from the user record in the DB
    await User.findByIdAndUpdate(
      (req as Request & { user: IUserDocument }).user._id,
      {
        $set: {
          refreshToken: "",
        },
      },
      {
        new: true,
      }
    );

    // Cookie options (secure + httpOnly)
    const options = {
      httpOnly: true,
      secure: true, // set to false if testing on HTTP (localhost)
    };

    // Clear cookies and respond
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, null, "User logged out successfully."));
  } catch (error: any) {
    // Fallback error handler
    return res
      .status(500)
      .json(new ApiResponse(500, null, error?.message || "Logout failed."));
  }
});

const refreshUserToken = asyncHandler(async (req, res) => {
  try {
    // Get the refresh token from either cookies or request params
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.params?.refreshToken;

    // Validate that the refresh token is provided
    if (!incomingRefreshToken) {
      throw new Error("Unauthorized.");
    }

    // Verify and decode the refresh token using JWT
    const decodedUser = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as refreshTokenJwtPayload;

    // Check if a user exists with the decoded ID
    const existedUser = await User.findById(decodedUser._id);
    if (!existedUser) {
      throw new Error("User not found.");
    }

    // Compare the provided refresh token with the one stored in DB
    const isRefreshTokenMatch =
      existedUser.refreshToken === incomingRefreshToken;
    if (!isRefreshTokenMatch) {
      throw new Error("Invalid token.");
    }

    // Generate a new access token and refresh token
    const newAccessToken = await existedUser.generateAccessToken();
    const newRefreshToken = await existedUser.generateRefreshToken();

    // Update the user document with the new refresh token
    const updatedUser = await User.findByIdAndUpdate(
      existedUser._id,
      {
        $set: {
          refreshToken: newRefreshToken,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    // Set secure, HTTP-only cookies with the new tokens
    const options = {
      httpOnly: true,
      secure: true,
    };

    // Send response with updated user and new tokens
    return res
      .status(200)
      .cookie("accessToken", newAccessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: updatedUser,
            newAccessToken,
            newRefreshToken,
          },
          "User token refreshed successfully."
        )
      );
  } catch (error: any) {
    // Handle and respond with any errors
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    // Extract old and new passwords from the request body
    const { oldPassword, newPassword } = req.body;

    // Validate input fields
    if (!oldPassword || !newPassword) {
      throw new Error("All fields are required");
    }

    // Find the logged-in user by ID
    const existedUser = await User.findById(
      (req as Request & { user: IUserDocument }).user._id
    );

    // If user is not found, throw error
    if (!existedUser) {
      throw new Error("User not found.");
    }

    // Compare the provided old password with the stored password
    const isPasswordMatch = await existedUser.isPasswordCorrect(oldPassword);
    if (!isPasswordMatch) {
      throw new Error("Invalid password.");
    }

    // Update user's password and clear the refresh token
    existedUser.password = newPassword;
    existedUser.refreshToken = "";

    // Save the updated user without running validations again
    await existedUser.save({ validateBeforeSave: false });

    // Define cookie options
    const options = {
      httpOnly: true,
      secure: true,
    };

    // Clear tokens and send success response
    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, null, "Password successfully changed."));
  } catch (error: any) {
    // Handle any error and respond with a 400 status
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const userProfile = asyncHandler(async (req, res) => {
  try {
    // Send back the authenticated user's data from the request object
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          (req as Request & { user: IUserDocument }).user,
          "User details fetched successfully"
        )
      );
  } catch (error: any) {
    // If an error occurs, return a 400 Bad Request (not 422 here)
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, error?.message || "Something went wrong")
      );
  }
});

const updateAvatar = asyncHandler(async (req, res) => {
  try {
    // Extract the avatar file path from the uploaded files
    const avatarLocalPath = (req.files as any)?.avatar?.[0]?.path;

    // Validate avatar path
    if (!avatarLocalPath) {
      throw new Error("Profile photo not found.");
    }

    // Upload the image to Cloudinary (or any cloud service you're using)
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Update the user's avatar in the database
    const updatedUser = await User.findByIdAndUpdate(
      (req as Request & { user: IUserDocument }).user._id,
      {
        $set: {
          avatar: avatar?.url,
        },
      },
      {
        new: true, // Return the updated user
      }
    ).select("-password -refreshToken"); // Exclude sensitive fields

    // Send success response with updated user
    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Profile updated successfully."));
  } catch (error: any) {
    // Handle and return error response
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, error?.message || "Something went wrong.")
      );
  }
});

const updateCover = asyncHandler(async (req, res) => {
  try {
    // Extract cover image path from uploaded files
    const coverLocalPath = (req.files as any)?.cover?.[0]?.path;

    // If no cover image found in the request
    if (!coverLocalPath) {
      throw new Error("Cover photo not found.");
    }

    // Upload the cover photo to Cloudinary (or your configured service)
    const cover = await uploadOnCloudinary(coverLocalPath);

    // Update the user's `cover` field in DB
    const updatedUser = await User.findByIdAndUpdate(
      (req as Request & { user: IUserDocument }).user._id,
      {
        $set: {
          cover: cover?.url,
        },
      },
      {
        new: true, // Return the updated document
      }
    ).select("-password -refreshToken"); // Exclude sensitive fields

    // Respond with updated user data
    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "Cover photo updated successfully.")
      );
  } catch (error: any) {
    // Handle and respond with error
    return res
      .status(400)
      .json(
        new ApiResponse(400, null, error?.message || "Something went wrong.")
      );
  }
});

const updateUser = asyncHandler(async (req, res) => {
  try {
    // Destructure required fields from the request body
    const { fullname, email, username, password } = req.body;

    // Basic input validation
    if (!fullname || !email || !username || !password) {
      throw new Error("All fields are required.");
    }

    // Get the logged-in user from DB using their ID
    const existingUser = await User.findById(
      (req as Request & { user: IUserDocument }).user._id
    );

    // If user not found
    if (!existingUser) {
      throw new Error("User not found.");
    }

    // Check if the entered password matches the stored password
    const isPasswordMatch = await existingUser.isPasswordCorrect(password);

    if (!isPasswordMatch) {
      throw new Error("Incorrect password.");
    }

    // Update the user fields with the new values
    existingUser.username = username;
    existingUser.email = email;
    existingUser.fullname = fullname;

    // Save changes without triggering validation hooks again
    await existingUser.save({ validateBeforeSave: false });

    // Send back a success response with updated fields (excluding sensitive info)
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          _id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          fullname: existingUser.fullname,
        },
        "User updated successfully."
      )
    );
  } catch (error: any) {
    // Send error response
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      throw new Error("Channel not found.");
    }

    const channel = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subscribersCount: {
            $size: "$subscribers",
          },
          subscribedToCount: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: {
                $in: [
                  (req as Request & { user: IUserDocument }).user._id,
                  "$subscribers.subscriber",
                ],
              },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullname: 1,
          username: 1,
          subscribersCount: 1,
          subscribedToCount: 1,
          isSubscribed: 1,
          avatar: 1,
          cover: 1,
        },
      },
    ]);

    if (!channel?.length) {
      throw new Error("channel does not exist.");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, channel, "Channel found successfully."));
  } catch (error: any) {
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

const getWatchHistory = asyncHandler(async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageSize = parseInt(String(page)) || 1;
    const limitSize = parseInt(String(limit)) || 10;
    const skip = (pageSize - 1) * limitSize;

    const watchHistory = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(
            String((req as Request & { user: IUserDocument }).user._id)
          ),
        },
      },
      {
        $project: {
          watchHistory: {
            $slice: ["$watchHistory", skip, limitSize],
          },
        },
      },
      {
        $lookup: {
          from: "videos",
          let: { historyIds: "$watchHistory" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", "$$historyIds"],
                },
              },
            },
          ],
          as: "watchHistory",
        },
      },
      {
        $project: {
          _id: 0,
          watchHistory: 1,
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(200, watchHistory[0]?.watchHistory || [], "success")
      );
  } catch (error: any) {
    return res.status(400).json(new ApiResponse(400, null, error.message));
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshUserToken,
  changeCurrentPassword,
  userProfile,
  updateAvatar,
  updateCover,
  updateUser,
  getUserChannelProfile,
  getWatchHistory,
};
