import { createClient } from '@supabase/supabase-js';
import { ENV } from "./env.config.js";

/**
 * Initialize Supabase client with service role key
 * This client has full admin access and bypasses Row Level Security (RLS)
 * Use only on the server-side, never expose to client
 */

const supabaseUrl = ENV.SUPABASE_URL || ENV.DATABASE_URL;
const supabaseKey = ENV.SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Supabase configuration missing!");
  console.error("Required environment variables:");
  console.error("  - SUPABASE_URL (or DATABASE_URL)");
  console.error("  - SUPABASE_SERVICE_ROLE_KEY");
  console.error("\nDatabase operations will fail until credentials are provided.");
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.match(/^https?:\/\//i)) {
  console.error(`❌ Invalid SUPABASE_URL format: ${supabaseUrl}`);
  console.error("URL must start with http:// or https://");
}

// Create Supabase client with enhanced configuration
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-application-name': 'codezen-server',
        },
      },
    })
  : null;

/**
 * Helper function to check if Supabase is configured
 * @returns {boolean} True if client is available
 */
export const isSupabaseConfigured = () => supabase !== null;

/**
 * Helper function to ensure Supabase is configured
 * @throws {Error} If Supabase client is not configured
 */
export const ensureSupabaseConfigured = () => {
  if (!supabase) {
    throw new Error(
      "Supabase client not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file."
    );
  }
};


