import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./features/auth/auth.routes.js";
import { apiRouter } from "./routes/api.js";
import { errorHandler } from "./middleware/error-handler.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Enable CORS for all requests (crucial for local web client calls)
app.use(cors());
app.use(express.json());

// Bind routes
app.use("/api/auth", authRouter);
app.use("/api", apiRouter);

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.use(errorHandler);

// Start listening
app.listen(port, () => {
  console.log(`Express ERP Server running on port ${port}`);
});
