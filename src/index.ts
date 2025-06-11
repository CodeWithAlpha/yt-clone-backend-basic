import dotenv from "dotenv";
import connectDB from "./db";
import { app } from "./app";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8080;

connectDB()
  .then(() =>
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    })
  )
  .catch((err) => console.log("connection Failed ", err));
