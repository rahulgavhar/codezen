import express from "express";
const router = express.Router();

import { checkHealth } from "../controllers/judge0.controller.js";

// Health check endpoint for Judge0 API
router.get("/health", checkHealth);

export default router;