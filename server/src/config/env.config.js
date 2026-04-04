import dotenv from "dotenv";
dotenv.config({ quiet: true });

export const ENV = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || "",
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || "",
  JUDGE_SERVER_URL: process.env.JUDGE_SERVER_URL || "",
  JUDGE_AUTH_TOKEN: process.env.JUDGE_AUTH_TOKEN || "",
  PUBLIC_BACKEND_URL: process.env.PUBLIC_BACKEND_URL || "http://localhost:3000",
  JUDGE_CALLBACK_URL: process.env.JUDGE_CALLBACK_URL || "",
  SUBSCRIPTION_ID: process.env.SUBSCRIPTION_ID || "",
  TENANT_ID: process.env.TENANT_ID || "",
  CLIENT_ID: process.env.CLIENT_ID || "",
  CLIENT_SECRET: process.env.CLIENT_SECRET || "",
  RESOURCE_GROUP: process.env.RESOURCE_GROUP || "",
  VM_NAME: process.env.VM_NAME || "",
  GROQ_API_KEY: process.env.GROQ_API_KEY || "",
  MAX_REQUEST_BODY_LIMIT: process.env.MAX_REQUEST_BODY_LIMIT || "20mb",
  MAX_SOURCE_CODE_BYTES: process.env.MAX_SOURCE_CODE_BYTES || "2097152",
  REPLAY_STORAGE_BUCKET: process.env.REPLAY_STORAGE_BUCKET || "contest_submission_events",
  REPLAY_FLUSH_INTERVAL_MS: process.env.REPLAY_FLUSH_INTERVAL_MS || "2000",
  REPLAY_FLUSH_EVENT_THRESHOLD: process.env.REPLAY_FLUSH_EVENT_THRESHOLD || "500",
  REPLAY_FLUSH_MAX_EVENTS: process.env.REPLAY_FLUSH_MAX_EVENTS || "500",
  JOB_RECOMMENDATION_API_URL:
    process.env.JOB_RECOMMENDATION_API_URL || "https://job-scrapper-mrj1.onrender.com",
  RESUMES_STORAGE_BUCKET: process.env.RESUMES_STORAGE_BUCKET || "resumes",
  REDIS: process.env.REDIS || "",
};
