import * as usersService from "../services/users.service.js";

/**
 * Get current user profile
 * Requires authentication (Clerk)
 */
export const getCurrentUserProfile = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await usersService.getUserProfile(clerkUserId);

    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error in getCurrentUserProfile:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch user profile",
    });
  }
};

/**
 * Update current user profile
 * Requires authentication (Clerk)
 */
export const updateCurrentUserProfile = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const updatedProfile = await usersService.updateUserProfileService(
      clerkUserId,
      req.body
    );

    return res.status(200).json(updatedProfile);
  } catch (error) {
    console.error("Error in updateCurrentUserProfile:", error);
    return res.status(500).json({
      error: error.message || "Failed to update user profile",
    });
  }
};

/**
 * Get current user activity
 * Requires authentication (Clerk)
 */
export const getCurrentUserActivity = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const activity = await usersService.getUserActivityService(clerkUserId);

    return res.status(200).json(activity);
  } catch (error) {
    console.error("Error in getCurrentUserActivity:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch user activity",
    });
  }
};

/**
 * Get current user rating history
 * Requires authentication (Clerk)
 */
export const getCurrentUserRatingHistory = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ratingHistory = await usersService.getUserRatingHistoryService(
      clerkUserId
    );

    return res.status(200).json(ratingHistory);
  } catch (error) {
    console.error("Error in getCurrentUserRatingHistory:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch rating history",
    });
  }
};

/**
 * Get public user profile by username
 * No authentication required
 */
export const getPublicUserProfile = async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    const profile = await usersService.getPublicUserProfileService(username);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error in getPublicUserProfile:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch user profile",
    });
  }
};

/**
 * Get user profile by clerk ID
 * No authentication required (public endpoint for interviews)
 */
export const getUserProfileByClerkId = async (req, res) => {
  try {
    const { clerkUserId } = req.params;

    if (!clerkUserId) {
      return res.status(400).json({ error: "Clerk user ID is required" });
    }

    const profile = await usersService.getUserProfile(clerkUserId);

    if (!profile) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error in getUserProfileByClerkId:", error);
    return res.status(500).json({
      error: error.message || "Failed to fetch user profile",
    });
  }
};

/**
 * Upload resume, store in Supabase Storage, and extract skills via job recommendation API
 * Requires authentication (Clerk)
 */
export const uploadResumeAndExtractSkills = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const result = await usersService.uploadResumeAndExtractSkillsService(
      clerkUserId,
      req.file,
      {
        top_n: req.body?.top_n,
      }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in uploadResumeAndExtractSkills:", error);

    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || "Failed to process resume",
    });
  }
};

/**
 * Get personalized recommendations from Job Recommendation API
 * Requires authentication (Clerk)
 */
export const getPersonalizedJobRecommendations = async (req, res) => {
  try {
    const auth = req.auth();
    const clerkUserId = auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const recommendations =
      await usersService.getPersonalizedJobRecommendationsService(clerkUserId, {
        top_n: req.query?.top_n,
      });

    return res.status(200).json(recommendations);
  } catch (error) {
    console.error("Error in getPersonalizedJobRecommendations:", error);

    const statusCode = error?.statusCode || 500;
    return res.status(statusCode).json({
      error: error.message || "Failed to fetch recommendations",
    });
  }
};
