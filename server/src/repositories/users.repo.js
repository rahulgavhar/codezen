import { supabase, ensureSupabaseConfigured } from "../config/supabase.client.js";

/**
 * Get user profile by Clerk user ID
 */
export const getUserProfileByClerkId = async (clerkUserId) => {
  try {
    ensureSupabaseConfigured();

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserProfileByClerkId:", error);
    throw error;
  }
};

/**
 * Get user profile by username
 */
export const getUserProfileByUsername = async (username) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getUserProfileByUsername:", error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (clerkUserId, updateData) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updateData)
      .eq("clerk_user_id", clerkUserId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user profile:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    throw error;
  }
};

/**
 * Update user skills
 */
export const updateUserSkills = async (clerkUserId, skills = []) => {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ skills })
      .eq("clerk_user_id", clerkUserId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user skills:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in updateUserSkills:", error);
    throw error;
  }
};

/**
 * Get user activity (submission counts by date)
 */
export const getUserActivity = async (clerkUserId) => {
  try {
    // Get user_id from clerk_user_id
    const userProfile = await getUserProfileByClerkId(clerkUserId);
    if (!userProfile) return [];

    const { data, error } = await supabase
      .from("submissions")
      .select("created_at")
      .eq("clerk_user_id", clerkUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching user activity:", error);
      return [];
    }

    // Group submissions by date
    const activityMap = {};
    data.forEach((submission) => {
      const date = new Date(submission.created_at).toISOString().split("T")[0];
      activityMap[date] = (activityMap[date] || 0) + 1;
    });

    // Convert to array format
    const activity = Object.entries(activityMap).map(([date, count]) => ({
      date,
      count,
    }));

    return activity;
  } catch (error) {
    console.error("Error in getUserActivity:", error);
    throw error;
  }
};

/**
 * Get user rating history (progress over contests)
 */
export const getUserRatingHistory = async (clerkUserId) => {
  try {
    const { data, error } = await supabase
      .from("rating_history")
      .select("*")
      .eq("clerk_user_id", clerkUserId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching rating history:", error);
      return [];
    }

    return data?.map((entry) => ({
      contest: entry.contest_id,
      rating: entry.new_rating,
      timestamp: entry.created_at,
      change: entry.rating_change,
    })) || [];
  } catch (error) {
    console.error("Error in getUserRatingHistory:", error);
    return [];
  }
};

/**
 * Get problems solved by user
 */
export const getUserProblemsSolved = async (clerkUserId) => {
  try {
    const { data, error } = await supabase
      .from("user_problem_status")
      .select("problem_id")
      .eq("clerk_user_id", clerkUserId)
      .eq("status", "solved");

    // Handle materialized view not populated error (code 55000) silently
    if (error?.code === "55000") {
      return 0;
    }

    if (error) {
      console.error("Error fetching problems solved:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in getUserProblemsSolved:", error);
    return 0;
  }
};

/**
 * Get contests participated by user
 */
export const getUserContestCount = async (clerkUserId) => {
  try {
    const { data, error } = await supabase
      .from("contest_registrations")
      .select("contest_id", { count: "exact", head: true })
      .eq("clerk_user_id", clerkUserId);

    // Handle materialized view not populated error (code 55000) silently
    if (error?.code === "55000") {
      return 0;
    }

    if (error) {
      console.error("Error fetching contest count:", error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error("Error in getUserContestCount:", error);
    return 0;
  }
};
