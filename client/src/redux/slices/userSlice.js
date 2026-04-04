import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../lib/axios";

const ME_PROFILE_QUERY = `
  query MeProfile {
    meProfile {
      clerk_user_id
      app_role
      username
      display_name
      email
      avatar_url
      bio
      rating
      max_rating
      problems_solved
      contests_participated
      skills
      is_banned
      created_at
    }
  }
`;

/* ================================
   Async Thunks
   ================================ */

/**
 * Fetch user profile from backend
 * Backend should return user data from Supabase
 */
export const fetchUserProfile = createAsyncThunk(
  "user/fetchUserProfile",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("/graphql", {
        query: ME_PROFILE_QUERY,
      });

      if (Array.isArray(response?.data?.errors) && response.data.errors.length > 0) {
        throw new Error(response.data.errors[0]?.message || "GraphQL request failed");
      }

      const profile = response?.data?.data?.meProfile;
      if (!profile) {
        throw new Error("Failed to fetch user profile");
      }

      return profile;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || "Failed to fetch user profile"
      );
    }
  }
);

/**
 * Update user profile in backend
 */
export const updateUserProfile = createAsyncThunk(
  "user/updateUserProfile",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put("/api/users/profile", userData);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update user profile"
      );
    }
  }
);

/**
 * Fetch user activity data (submissions, contests, etc.)
 */
export const fetchUserActivity = createAsyncThunk(
  "user/fetchUserActivity",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/users/activity");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch user activity"
      );
    }
  }
);

/**
 * Fetch user rating history
 */
export const fetchUserRatingHistory = createAsyncThunk(
  "user/fetchUserRatingHistory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("/api/users/rating-history");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch rating history"
      );
    }
  }
);

/* ================================
   Initial State
   ================================ */

const initialState = {
  profile: null,
  activity: [],
  ratingHistory: [],
  loading: false,
  error: null,
  profileLoading: false,
  activityLoading: false,
  ratingHistoryLoading: false,
};

/* ================================
   User Slice
   ================================ */

const userSlice = createSlice({
  name: "user",
  initialState,

  reducers: {
    /**
     * Clear user data (useful for logout)
     */
    clearUser: (state) => {
      state.profile = null;
      state.activity = [];
      state.ratingHistory = [];
      state.error = null;
    },

    /**
     * Update user profile in Redux (without API call)
     * Useful for real-time updates from webhooks
     */
    updateUserLocally: (state, action) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },

    /**
     * Add activity entry locally
     */
    addActivityEntry: (state, action) => {
      state.activity.unshift(action.payload);
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },

  extraReducers: (builder) => {
    // Fetch User Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.profileLoading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.profileLoading = false;
        state.profile = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.profileLoading = false;
        state.error = action.payload;
      });

    // Update User Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch User Activity
    builder
      .addCase(fetchUserActivity.pending, (state) => {
        state.activityLoading = true;
      })
      .addCase(fetchUserActivity.fulfilled, (state, action) => {
        state.activityLoading = false;
        state.activity = action.payload;
      })
      .addCase(fetchUserActivity.rejected, (state, action) => {
        state.activityLoading = false;
        state.error = action.payload;
      });

    // Fetch User Rating History
    builder
      .addCase(fetchUserRatingHistory.pending, (state) => {
        state.ratingHistoryLoading = true;
      })
      .addCase(fetchUserRatingHistory.fulfilled, (state, action) => {
        state.ratingHistoryLoading = false;
        state.ratingHistory = action.payload;
      })
      .addCase(fetchUserRatingHistory.rejected, (state, action) => {
        state.ratingHistoryLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearUser,
  updateUserLocally,
  addActivityEntry,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;
