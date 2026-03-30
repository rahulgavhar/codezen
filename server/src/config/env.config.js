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
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
};
