import express from "express";
import multer from "multer";
const router = express.Router();

import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
  getCurrentUserActivity,
  getCurrentUserRatingHistory,
  getPublicUserProfile,
  getPublicUserActivity,
  getPublicUserRatingHistory,
  getUserProfileByClerkId,
  uploadResumeAndExtractSkills,
  getPersonalizedJobRecommendations,
} from "../controllers/users.controller.js";

const MAX_RESUME_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_RESUME_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_RESUME_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF, DOC, DOCX, or TXT files are allowed"));
  },
});

const handleResumeUpload = (req, res, next) => {
  const middleware = resumeUpload.single("resume");

  middleware(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        error: error.message || "Invalid resume upload request",
      });
    }

    return next();
  });
};

// Protected routes (require Clerk authentication)
router.get("/profile", getCurrentUserProfile);
router.put("/profile", updateCurrentUserProfile);
router.get("/activity", getCurrentUserActivity);
router.get("/rating-history", getCurrentUserRatingHistory);
router.post("/resume", handleResumeUpload, uploadResumeAndExtractSkills);
router.get("/recommendations", getPersonalizedJobRecommendations);

// Public routes (no authentication required)
router.get("/public/:username/activity", getPublicUserActivity);
router.get("/public/:username/rating-history", getPublicUserRatingHistory);
router.get("/public/:username", getPublicUserProfile);
router.get("/profile/:clerkUserId", getUserProfileByClerkId);

export default router;
