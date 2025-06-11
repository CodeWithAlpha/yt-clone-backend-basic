import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

//initilize app
const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));
//set linit to get json data
app.use(express.json({ limit: "16kb" }));
//for understand url where url auto convert with %20 or + for spaces
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
//path for static files like images...
app.use(express.static("public"));
app.use(cookieParser());

import userRoute from "./routes/user.routes";
import videoRoute from "./routes/video.routes";
import subscribeRoute from "./routes/subscription.route";
import commentRoute from "./routes/comment.route";
import likeRoute from "./routes/like.route";

app.use("/api/v1/users", userRoute);
app.use("/api/v1/videos", videoRoute);
app.use("/api/v1/subscription", subscribeRoute);
app.use("/api/v1/comment", commentRoute);
app.use("/api/v1/like", likeRoute);

export { app };
