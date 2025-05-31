import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middlewares
app.use(cors());
app.use(express.json()); // You can enable this to parse JSON bodies

// Test Route
app.get("/", (req, res) => {
  console.log("GET / route hit");
  res.send("<h1>Welcome</h1>");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
