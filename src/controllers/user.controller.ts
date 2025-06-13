import { Request } from "express";
import { User } from "../models/user.model";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadOnCloudinary } from "../utils/cloudinary";
import jwt, { JwtPayload } from "jsonwebtoken";
import { IUserDocument } from "../types/user";
import { refreshTokenJwtPayload } from "../types/jwt";
import mongoose from "mongoose";

const registerUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, fullname, password } = req.body;

    if (
      [username, email, fullname, password].some((fields) => fields.trim === "")
    ) {
      throw new ApiError(400, "All fields are required.");
    }

    const isUserExists = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (isUserExists) {
      throw new ApiError(409, "User Already Exists.");
    }

    const avatarLocalPath = (req.files as any)?.avatar[0].path;
    const coverLocalPath =
      !!req.files?.length && (req.files as any)?.cover[0].path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar field is required.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const cover = coverLocalPath
      ? await uploadOnCloudinary(coverLocalPath)
      : { url: "" };

    if (!avatar) {
      throw new ApiError(400, "Avatar is required.");
    }

    const user = await User.create({
      username: username.trim().toLowerCase(),
      email,
      fullname,
      password,
      avatar: avatar?.url,
      cover: cover?.url || "",
    });

    const createdUser = await User.findById({ _id: user._id }).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, "Something went wrong while Register the user.");
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User Created Successfully."));
  } catch (error) {
    console.warn(error);
    throw new ApiError(500, "something went wrong while register user.");
  }
});

const loginUser = asyncHandler(async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // keys validation
    if (!(username || email) || !password) {
      throw new ApiError(400, "All fields are required.");
    }

    // check is valid user or not
    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (!existedUser) throw new ApiError(409, "User does not exits.");

    // match password
    const isPasswordValid = await existedUser.isPasswordCorrect(password);
    if (!isPasswordValid)
      throw new ApiError(400, "Please enter valid password.");

    // generate access and refresh token
    const accessToken = await existedUser.generateAccessToken();
    const refreshToken = await existedUser.generateRefreshToken();

    // eject refresh token to user DB
    existedUser.refreshToken = refreshToken;

    // save updated user
    const updatedUser = await existedUser.save({ validateBeforeSave: false });

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { userId: updatedUser._id, accessToken, refreshToken },
          "User login successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "something went wrong while login user.");
  }
});

const logoutUser = asyncHandler(async (req, res) => {
  try {
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

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, null, "User Logged Out"));
  } catch (error) {}
});

const refreshUserToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.params?.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(400, "Unauthorized.");
    }

    const decodedUser = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as refreshTokenJwtPayload;

    const existedUser = await User.findById(decodedUser._id);

    if (!existedUser) {
      throw new ApiError(400, "User Not Found.");
    }

    const isRefreshTokenMatch =
      existedUser.refreshToken === incomingRefreshToken;

    if (!isRefreshTokenMatch) {
      throw new ApiError(400, "Invalid Token.");
    }

    const newAccessToken = await existedUser.generateAccessToken();
    const newRefreshToken = await existedUser.generateRefreshToken();

    const updatedUser = await User.findByIdAndUpdate(
      existedUser._id,
      {
        $set: {
          refreshToken: newRefreshToken,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    const options = {
      httpOnly: true,
      secure: true,
    };

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
          "User Refresh successfully."
        )
      );
  } catch (error) {
    throw new ApiError(400, "Error while refresh user.");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findById(
      (req as Request & { user: IUserDocument }).user._id
    );

    if (!existedUser) {
      throw new ApiError(400, "User not found.");
    }

    const isPasswordMatch = await existedUser.isPasswordCorrect(oldPassword);

    if (!isPasswordMatch) {
      throw new ApiError(400, "Invalid password.");
    }

    existedUser.password = newPassword;
    (existedUser.refreshToken = ""),
      await existedUser.save({ validateBeforeSave: false });

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, null, "Password Successfully changed."));
  } catch (error) {
    throw new ApiError(
      400,
      (error as string) || "something went wrong while change the password."
    );
  }
});

const userProfile = asyncHandler(async (req, res) => {
  try {
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          (req as Request & { user: IUserDocument }).user,
          "User details fetched successfully"
        )
      );
  } catch (error) {
    return res.send(400).json(new ApiResponse(422, error));
  }
});

const updateAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = await (req.files as any).avatar[0].path;

    if (!avatarLocalPath) {
      throw new ApiError(400, "Profile photo not found.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    const updatedUser = await User.findByIdAndUpdate(
      (req as Request & { user: IUserDocument }).user._id,
      {
        $set: {
          avatar: avatar?.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "Profile Update Successfully."));
  } catch (error) {
    throw new ApiError(400, error as string);
  }
});

const updateCover = asyncHandler(async (req, res) => {
  try {
    const coverLocalPath = await (req.files as any).cover[0].path;

    if (!coverLocalPath) {
      throw new ApiError(400, "Cover photo not found.");
    }

    const cover = await uploadOnCloudinary(coverLocalPath);

    const updatedUser = await User.findByIdAndUpdate(
      (req as Request & { user: IUserDocument }).user._id,
      {
        $set: {
          cover: cover?.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedUser, "Cover photo Update Successfully.")
      );
  } catch (error) {
    throw new ApiError(400, error as string);
  }
});

const updateUser = asyncHandler(async (req, res) => {
  try {
    const { fullname, email, username, password } = req.body;

    if (!fullname || !email || !username || !password) {
      throw new ApiError(400, "All fields are required.");
    }

    const existingUser = await User.findById(
      (req as Request & { user: IUserDocument }).user._id
    );

    if (!existingUser) {
      throw new ApiError(400, "User not found.");
    }

    const isPasswordMatch = await existingUser.isPasswordCorrect(password);

    if (!isPasswordMatch) {
      throw new ApiError(400, "Incorrect password.");
    }

    existingUser.username = username;
    existingUser.email = email;
    existingUser.fullname = fullname;

    await existingUser.save({ validateBeforeSave: false });

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          _id: existingUser._id,
          username: existingUser.username,
          email: existingUser.email,
          fullname: existingUser.fullname,
        },
        "User update Successfully."
      )
    );
  } catch (error) {
    throw new ApiError(400, error as string);
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Channel not found.");
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
    throw new ApiError(400, "channel does not exist.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, channel, "Channel found successfully."));
});

const getWatchHistory = asyncHandler(async (req, res) => {
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

  res
    .status(200)
    .json(new ApiResponse(200, watchHistory[0]?.watchHistory || [], "success"));
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
