import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

//initilize app
const app = express();

//set cross origin
app.use(cors({ origin: process.env.CORS_ORIGIN, credentials: true }));

//set linit to get json data
app.use(express.json({ limit: "16kb" }));

//for understand url where url auto convert with %20 or + for spaces
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

//path for static files like images...
app.use(express.static("public"));

//perform CRUD operation with user's cookies
app.use(cookieParser());

export { app };
