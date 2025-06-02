import dotenv from "dotenv";

import connectDB from "./db";
import { app } from "./app";

dotenv.config();

const PORT = process.env.PORT || 8080;

// Middlewares
// app.use(cors());
// app.use(express.json()); // You can enable this to parse JSON bodies

connectDB()
  .then(() =>
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    })
  )
  .catch((err) => console.log("connection Failed ", err));

// Test Route
app.get("/", (req, res) => {
  console.log("GET / route hit");
  res.send("<h1>Welcome</h1>");
});
