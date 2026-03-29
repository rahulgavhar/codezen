import * as usersRepo from "../repositories/users.repo.js";

/**
 * Get user profile service
 * Auto-creates profile if it doesn't exist (for new users)
 */
export const getUserProfile = async (clerkUserId) => {
  try {
    let profile = await usersRepo.getUserProfileByClerkId(clerkUserId);

    // If profile doesn't exist, try to create it (new user from Clerk)
    if (!profile) {
      console.log("📝 Profile not found for user:", clerkUserId);
      console.log("⚠️ Profile will be created by Clerk webhook. Trying to fetch basic data from Clerk...");
      
      // Return a minimal profile structure while waiting for webhook
      // The actual profile will be created by Clerk webhook
      profile = {
        clerk_user_id: clerkUserId,
        app_role: null, // New users have NULL role
        username: null,
        display_name: null,
        email: null,
        avatar_url: null,
        bio: null,
        rating: 1200,
        max_rating: 1200,
        is_banned: false,
        created_at: new Date().toISOString(),
      };
      
      return profile;
    }

    // Enrich profile with additional stats
    const problemsSolved = await usersRepo.getUserProblemsSolved(clerkUserId);
    const contestsParticipated = await usersRepo.getUserContestCount(clerkUserId);

    return {
      ...profile,
      problems_solved: problemsSolved,
      contests_participated: contestsParticipated,
    };
  } catch (error) {
    console.error("Error in getUserProfile service:", error);
    throw error;
  }
};

/**
 * Update user profile service
 */
export const updateUserProfileService = async (clerkUserId, updateData) => {
  try {
    // Get current profile to check if user is in onboarding
    const currentProfile = await usersRepo.getUserProfileByClerkId(clerkUserId);

    if (!currentProfile) {
      throw new Error("User profile not found");
    }

    // Validate updateData
    let allowedFields = [
      "display_name",
      "bio",
      "avatar_url",
      "username",
    ];

    // Allow app_role update ONLY during onboarding (when app_role is NULL)
    if (currentProfile.app_role === null && updateData.app_role) {
      allowedFields = [...allowedFields, "app_role"];
    }

    const sanitizedData = {};

    Object.keys(updateData).forEach((key) => {
      if (allowedFields.includes(key)) {
        sanitizedData[key] = updateData[key];
      }
    });

    if (Object.keys(sanitizedData).length === 0) {
      throw new Error("No valid fields to update");
    }

    const updatedProfile = await usersRepo.updateUserProfile(
      clerkUserId,
      sanitizedData
    );

    return updatedProfile;
  } catch (error) {
    console.error("Error in updateUserProfileService:", error);
    throw error;
  }
};

/**
 * Get user activity service
 */
export const getUserActivityService = async (clerkUserId) => {
  try {
    const activity = await usersRepo.getUserActivity(clerkUserId);
    return activity;
  } catch (error) {
    console.error("Error in getUserActivityService:", error);
    throw error;
  }
};

/**
 * Get user rating history service
 */
export const getUserRatingHistoryService = async (clerkUserId) => {
  try {
    const ratingHistory = await usersRepo.getUserRatingHistory(clerkUserId);
    return ratingHistory;
  } catch (error) {
    console.error("Error in getUserRatingHistoryService:", error);
    throw error;
  }
};

/**
 * Get public user profile by username service
 */
export const getPublicUserProfileService = async (username) => {
  try {
    const profile = await usersRepo.getUserProfileByUsername(username);

    if (!profile) {
      return null;
    }

    // Enrich profile with additional stats
    const clerkUserId = profile.clerk_user_id;
    const problemsSolved = await usersRepo.getUserProblemsSolved(clerkUserId);
    const contestsParticipated = await usersRepo.getUserContestCount(
      clerkUserId
    );

    return {
      ...profile,
      problems_solved: problemsSolved,
      contests_participated: contestsParticipated,
    };
  } catch (error) {
    console.error("Error in getPublicUserProfileService:", error);
    throw error;
  }
};
