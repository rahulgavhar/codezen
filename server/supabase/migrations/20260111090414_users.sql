--------------------------------------------------------------------------------
-- ENUM for app_role (type safety)
--------------------------------------------------------------------------------
CREATE TYPE app_role AS ENUM ('user', 'staff');

--------------------------------------------------------------------------------
-- User Profiles
-- Stores app-level metadata for users authenticated via Clerk
--------------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
    -- Clerk user id (primary key, UUID)
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT UNIQUE NOT NULL,

    -- Public identity
    username TEXT UNIQUE NOT NULL
        CHECK (char_length(username) BETWEEN 3 AND 32),

    display_name TEXT NOT NULL
        CHECK (char_length(display_name) BETWEEN 3 AND 32),

    -- Informational only (source of truth: Clerk)
    email TEXT UNIQUE NOT NULL,
    
    -- App-level role (user or staff)
    app_role app_role,

    -- Company name (unique, lowercase, enforced null for users, optional for staff, before onboarding)
  company_name TEXT UNIQUE CHECK (app_role = 'staff' OR company_name IS NULL),

    skills TEXT[],
    CONSTRAINT user_profiles_skills_only_for_users
        CHECK (skills IS NULL OR app_role = 'user'),

    -- Competitive rating
    rating INT NOT NULL DEFAULT 1200
        CHECK (rating >= 0),

    max_rating INT NOT NULL DEFAULT 1200
        CHECK (max_rating >= rating),

    -- Profile
    avatar_url TEXT,
    bio TEXT CHECK (char_length(bio) <= 500),

    -- Moderation
    is_banned BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    created_at timestamptz NOT NULL DEFAULT now(),
    last_active_at timestamptz
);

--------------------------------------------------------------------------------
-- Indexes
--------------------------------------------------------------------------------
CREATE INDEX idx_user_profiles_leaderboard
ON public.user_profiles (rating DESC)
WHERE is_banned = false;

CREATE INDEX idx_user_profiles_created_at
ON public.user_profiles (created_at DESC);

CREATE INDEX idx_user_profiles_staff
ON public.user_profiles (app_role, created_at DESC)
WHERE app_role = 'staff';

--------------------------------------------------------------------------------
-- Trigger Function
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------------------------------------
-- Trigger Function to convert company_name to lowercase
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lowercase_company_name()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_name IS NOT NULL THEN
        NEW.company_name = LOWER(TRIM(NEW.company_name));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_lowercase_company_name
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.lowercase_company_name();

--------------------------------------------------------------------------------
-- Enable Row Level Security
--------------------------------------------------------------------------------
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- SELECT Policies
--------------------------------------------------------------------------------

-- Public profiles (leaderboard etc.)
CREATE POLICY "Public profiles readable"
ON public.user_profiles
FOR SELECT
USING (is_banned = false);

-- Own profile access (redundant but explicit)
CREATE POLICY "Users can read own profile"
ON public.user_profiles
FOR SELECT
USING (auth.jwt() ->> 'sub' = clerk_user_id);

--------------------------------------------------------------------------------
-- INSERT Policy (for webhook / system)
--------------------------------------------------------------------------------
CREATE POLICY "Allow insert"
ON public.user_profiles
FOR INSERT
WITH CHECK (true);

--------------------------------------------------------------------------------
-- UPDATE Policies (CRITICAL)
--------------------------------------------------------------------------------

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.user_profiles
FOR UPDATE
USING (
  auth.jwt() ->> 'sub' = clerk_user_id
)
WITH CHECK (
  auth.jwt() ->> 'sub' = clerk_user_id
);

--------------------------------------------------------------------------------
-- BEFORE UPDATE Trigger to prevent role changes after onboarding
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.app_role IS NOT NULL AND NEW.app_role IS DISTINCT FROM OLD.app_role THEN
        RAISE EXCEPTION 'Cannot change app_role after onboarding';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_role_change
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change();