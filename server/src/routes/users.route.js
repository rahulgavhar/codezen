import express from "express";
const router = express.Router();

import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  getCurrentUserActivity,
  getCurrentUserRatingHistory,
  getPublicUserProfile,
  getUserProfileByClerkId,
} from "../controllers/users.controller.js";

// Protected routes (require Clerk authentication)
router.get("/profile", getCurrentUserProfile);
router.put("/profile", updateCurrentUserProfile);
router.get("/activity", getCurrentUserActivity);
router.get("/rating-history", getCurrentUserRatingHistory);

// Public routes (no authentication required)
router.get("/public/:username", getPublicUserProfile);
router.get("/profile/:clerkUserId", getUserProfileByClerkId);

export default router;
