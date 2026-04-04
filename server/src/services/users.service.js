import * as usersRepo from "../repositories/users.repo.js";
import { ENV } from "../config/env.config.js";
import { supabase, ensureSupabaseConfigured } from "../config/supabase.client.js";

const JOB_RECOMMENDATION_API_URL = String(
  ENV.JOB_RECOMMENDATION_API_URL || "https://job-scrapper-mrj1.onrender.com"
).replace(/\/+$/, "");
const RESUMES_STORAGE_BUCKET = ENV.RESUMES_STORAGE_BUCKET || "resumes";
const DEFAULT_TOP_RECOMMENDATIONS = 20;
const MAX_TOP_RECOMMENDATIONS = 50;

const SKILL_PAYLOAD_KEYS = [
  "skills",
  "skill",
  "extracted_skills",
  "technical_skills",
  "matched_skills",
  "skill_set",
  "skillset",
];

const buildHttpError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const normalizeSkills = (skills = []) => {
  if (!Array.isArray(skills)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const entry of skills) {
    if (typeof entry !== "string") continue;

    const trimmed = entry.trim();
    if (!trimmed) continue;

    const dedupeKey = trimmed.toLowerCase();
    if (seen.has(dedupeKey)) continue;

    seen.add(dedupeKey);
    normalized.push(trimmed);
  }

  return normalized;
};

const extractSkillsFromPayload = (payload) => {
  if (Array.isArray(payload)) {
    return normalizeSkills(payload);
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  for (const key of SKILL_PAYLOAD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      const extracted = extractSkillsFromPayload(payload[key]);
      if (extracted.length > 0) {
        return extracted;
      }
    }
  }

  for (const value of Object.values(payload)) {
    const extracted = extractSkillsFromPayload(value);
    if (extracted.length > 0) {
      return extracted;
    }
  }

  return [];
};

const getJobApiUrl = (endpoint) => {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${JOB_RECOMMENDATION_API_URL}${normalizedEndpoint}`;
};

const sanitizeFileName = (name) => {
  if (!name || typeof name !== "string") {
    return "resume";
  }

  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
};

const parseTopN = (value) => {
  const parsed = Number.parseInt(String(value ?? DEFAULT_TOP_RECOMMENDATIONS), 10);
  if (Number.isNaN(parsed)) {
    return DEFAULT_TOP_RECOMMENDATIONS;
  }

  return Math.min(Math.max(parsed, 1), MAX_TOP_RECOMMENDATIONS);
};

const buildRecommendationsResponse = (payload, topN) => {
  const recommendations = Array.isArray(payload?.recommendations)
    ? payload.recommendations
    : [];

  return {
    success: Boolean(payload?.success ?? true),
    extracted_skills: normalizeSkills(payload?.extracted_skills || []),
    skills_count: Number(payload?.skills_count || 0),
    recommendations,
    recommendations_count: Number(payload?.recommendations_count || recommendations.length),
    error: payload?.error || null,
    requested_top_n: topN,
  };
};

const callJobApiWithFile = async (endpoint, file, queryParams = {}) => {
  const params = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    params.set(key, String(value));
  });

  const baseUrl = getJobApiUrl(endpoint);
  const requestUrl = params.size > 0 ? `${baseUrl}?${params.toString()}` : baseUrl;

  const formData = new FormData();
  const fileBlob = new Blob([file.buffer], {
    type: file.mimetype || "application/octet-stream",
  });
  formData.append("file", fileBlob, file.originalname || "resume");

  const response = await fetch(requestUrl, {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();
  let parsedBody = null;

  if (responseText) {
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = { message: responseText };
    }
  }

  if (!response.ok) {
    throw buildHttpError(
      `Job recommendation API request failed for ${endpoint} with status ${response.status}`,
      502
    );
  }

  return parsedBody || {};
};

const getLatestResumeFileForUser = async (clerkUserId) => {
  ensureSupabaseConfigured();

  const { data: objects, error: listError } = await supabase.storage
    .from(RESUMES_STORAGE_BUCKET)
    .list(clerkUserId, {
      limit: 100,
      offset: 0,
    });

  if (listError) {
    throw buildHttpError(`Failed to read uploaded resumes: ${listError.message}`, 500);
  }

  const files = Array.isArray(objects)
    ? objects.filter((item) => item?.name && !item?.name.endsWith("/"))
    : [];

  if (files.length === 0) {
    throw buildHttpError("Upload Resume in Your Profile", 404);
  }

  const latestFile = [...files].sort((a, b) => {
    const aDate = new Date(a?.created_at || a?.updated_at || 0).getTime();
    const bDate = new Date(b?.created_at || b?.updated_at || 0).getTime();
    if (aDate !== bDate) {
      return bDate - aDate;
    }
    return String(b?.name || "").localeCompare(String(a?.name || ""));
  })[0];

  const objectPath = `${clerkUserId}/${latestFile.name}`;
  const { data: blobData, error: downloadError } = await supabase.storage
    .from(RESUMES_STORAGE_BUCKET)
    .download(objectPath);

  if (downloadError || !blobData) {
    throw buildHttpError(
      `Failed to load uploaded resume: ${downloadError?.message || "Unknown download error"}`,
      500
    );
  }

  const arrayBuffer = await blobData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const originalNameParts = String(latestFile.name).split("-");
  const inferredName =
    originalNameParts.length > 1
      ? originalNameParts.slice(1).join("-")
      : latestFile.name;

  return {
    buffer,
    size: buffer.length,
    mimetype: latestFile?.metadata?.mimetype || blobData.type || "application/octet-stream",
    originalname: inferredName,
  };
};

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

    // Allow app_role and company_name update ONLY during onboarding (when app_role is NULL)
    if (currentProfile.app_role === null && updateData.app_role) {
      allowedFields = [...allowedFields, "app_role"];
      
      // For staff, also allow company_name during onboarding
      if (updateData.app_role === 'staff' && updateData.company_name) {
        allowedFields = [...allowedFields, "company_name"];
      }
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

/**
 * Get public user activity by username service
 */
export const getPublicUserActivityService = async (username) => {
  try {
    const profile = await usersRepo.getUserProfileByUsername(username);

    if (!profile) {
      return null;
    }

    return usersRepo.getUserActivity(profile.clerk_user_id);
  } catch (error) {
    console.error("Error in getPublicUserActivityService:", error);
    throw error;
  }
};

/**
 * Get public user rating history by username service
 */
export const getPublicUserRatingHistoryService = async (username) => {
  try {
    const profile = await usersRepo.getUserProfileByUsername(username);

    if (!profile) {
      return null;
    }

    return usersRepo.getUserRatingHistory(profile.clerk_user_id);
  } catch (error) {
    console.error("Error in getPublicUserRatingHistoryService:", error);
    throw error;
  }
};

/**
 * Upload resume to Supabase Storage and extract skills through external API
 */
export const uploadResumeAndExtractSkillsService = async (
  clerkUserId,
  file,
  options = {}
) => {
  try {
    if (!file?.buffer || !file?.originalname) {
      throw buildHttpError("Invalid resume file payload", 400);
    }

    const currentProfile = await usersRepo.getUserProfileByClerkId(clerkUserId);
    if (!currentProfile) {
      throw buildHttpError("User profile not found", 404);
    }

    if (currentProfile.app_role !== "user") {
      throw buildHttpError("Only users can upload resumes and extract skills", 403);
    }

    const topN = parseTopN(options?.top_n);

    ensureSupabaseConfigured();

    const safeName = sanitizeFileName(file.originalname);
    const storagePath = `${clerkUserId}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(RESUMES_STORAGE_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw buildHttpError(`Failed to upload resume: ${uploadError.message}`, 500);
    }

    const { data: publicUrlData } = supabase.storage
      .from(RESUMES_STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const uploadedStorageUrl = publicUrlData?.publicUrl || null;

    let uploadResumeResponse = {};
    let analyzeResumeResponse = {};
    let getRecommendationsResponse = {};

    const warnings = [];

    try {
      uploadResumeResponse = await callJobApiWithFile("/upload-resume", file);
    } catch (error) {
      warnings.push(`upload-resume failed: ${error.message}`);
    }

    try {
      analyzeResumeResponse = await callJobApiWithFile("/analyze-resume", file);
    } catch (error) {
      warnings.push(`analyze-resume failed: ${error.message}`);
    }

    try {
      const recommendationsPayload = await callJobApiWithFile(
        "/get-recommendations",
        file,
        { top_n: topN }
      );
      getRecommendationsResponse = buildRecommendationsResponse(
        recommendationsPayload,
        topN
      );
    } catch (error) {
      warnings.push(`get-recommendations failed: ${error.message}`);
      getRecommendationsResponse = buildRecommendationsResponse(
        {
          success: false,
          recommendations: [],
          recommendations_count: 0,
          error: error.message,
          extracted_skills: [],
          skills_count: 0,
        },
        topN
      );
    }

    const normalizedSkills = normalizeSkills([
      ...(normalizeSkills(uploadResumeResponse?.skills || []) || []),
      ...(normalizeSkills(analyzeResumeResponse?.extracted_skills || []) || []),
      ...(normalizeSkills(getRecommendationsResponse?.extracted_skills || []) || []),
      ...extractSkillsFromPayload(uploadResumeResponse),
      ...extractSkillsFromPayload(analyzeResumeResponse),
    ]);

    let persistedSkills = normalizeSkills(currentProfile.skills || []);
    let extracted = normalizedSkills.length > 0;

    if (normalizedSkills.length > 0) {
      const updatedProfile = await usersRepo.updateUserSkills(clerkUserId, normalizedSkills);
      persistedSkills = normalizeSkills(updatedProfile?.skills || []);
    }

    const uploadResumeRecommendations = Array.isArray(uploadResumeResponse?.recommendations)
      ? uploadResumeResponse.recommendations
      : [];

    const analyzeResumeRecommendations = Array.isArray(analyzeResumeResponse?.recommendations)
      ? analyzeResumeResponse.recommendations
      : [];

    return {
      success: true,
      message:
        uploadResumeResponse?.message ||
        (extracted
          ? "Resume processed successfully"
          : "Resume uploaded but no skills were extracted"),
      extracted,
      skills: persistedSkills,
      resume: {
        bucket: RESUMES_STORAGE_BUCKET,
        path: storagePath,
        storage_url: uploadedStorageUrl,
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
      },
      upload_resume: {
        success: Boolean(uploadResumeResponse?.success ?? warnings.length === 0),
        message: uploadResumeResponse?.message || null,
        file_name: uploadResumeResponse?.file_name || file.originalname,
        file_path: uploadResumeResponse?.file_path || storagePath,
        storage_url: uploadResumeResponse?.storage_url || uploadedStorageUrl,
        skills: normalizeSkills(uploadResumeResponse?.skills || []),
        recommendations: uploadResumeRecommendations,
        recommendations_count: Number(
          uploadResumeResponse?.recommendations_count ||
            uploadResumeRecommendations.length
        ),
      },
      analyze_resume: {
        success: Boolean(analyzeResumeResponse?.success ?? true),
        extracted_skills: normalizeSkills(analyzeResumeResponse?.extracted_skills || []),
        skills_count: Number(
          analyzeResumeResponse?.skills_count ||
            normalizeSkills(analyzeResumeResponse?.extracted_skills || []).length
        ),
        recommendations: analyzeResumeRecommendations,
        recommendations_count: Number(
          analyzeResumeResponse?.recommendations_count ||
            analyzeResumeRecommendations.length
        ),
        error: analyzeResumeResponse?.error || null,
      },
      get_recommendations: getRecommendationsResponse,
      warnings,
    };
  } catch (error) {
    console.error("Error in uploadResumeAndExtractSkillsService:", error);
    throw error;
  }
};

/**
 * Fetch personalized job recommendations for signed-in user
 */
export const getPersonalizedJobRecommendationsService = async (
  clerkUserId,
  queryParams = {}
) => {
  try {
    const currentProfile = await usersRepo.getUserProfileByClerkId(clerkUserId);
    if (!currentProfile) {
      throw buildHttpError("User profile not found", 404);
    }

    if (currentProfile.app_role !== "user") {
      throw buildHttpError("Only users can fetch personalized recommendations", 403);
    }

    const topN = parseTopN(queryParams?.top_n);
    const latestResumeFile = await getLatestResumeFileForUser(clerkUserId);
    const payload = await callJobApiWithFile(
      "/get-recommendations",
      latestResumeFile,
      { top_n: topN }
    );

    return buildRecommendationsResponse(payload, topN);
  } catch (error) {
    console.error("Error in getPersonalizedJobRecommendationsService:", error);
    throw error;
  }
};
