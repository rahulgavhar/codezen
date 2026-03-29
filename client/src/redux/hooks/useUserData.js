import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import {
  fetchUserProfile,
  fetchUserActivity,
  fetchUserRatingHistory,
  clearUser,
} from "../slices/userSlice";

/**
 * Custom hook to manage user data from Redux
 * Automatically fetches profile on mount
 *
 * Usage:
 * const { profile, activity, ratingHistory, loading, error } = useUserData();
 */
export const useUserData = () => {
  const dispatch = useDispatch();
  const {
    profile,
    activity,
    ratingHistory,
    profileLoading,
    activityLoading,
    ratingHistoryLoading,
    error,
  } = useSelector((state) => state.user);

  // Fetch profile on mount
  useEffect(() => {
    if (!profile) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, profile]);

  const refetchUserData = async () => {
    await dispatch(fetchUserProfile());
  };

  const refetchActivity = async () => {
    await dispatch(fetchUserActivity());
  };

  const refetchRatingHistory = async () => {
    await dispatch(fetchUserRatingHistory());
  };

  const logout = () => {
    dispatch(clearUser());
  };

  return {
    profile,
    activity,
    ratingHistory,
    loading: profileLoading,
    activityLoading,
    ratingHistoryLoading,
    error,
    refetchUserData,
    refetchActivity,
    refetchRatingHistory,
    logout,
  };
};

/**
 * Alternative hook for just profile data
 */
export const useUserProfile = () => {
  const dispatch = useDispatch();
  const { profile, profileLoading, error } = useSelector(
    (state) => state.user
  );

  useEffect(() => {
    if (!profile) {
      dispatch(fetchUserProfile());
    }
  }, [dispatch, profile]);

  return {
    profile,
    loading: profileLoading,
    error,
    refetch: () => dispatch(fetchUserProfile()),
  };
};

/**
 * Hook to get user activity
 */
export const useUserActivity = () => {
  const dispatch = useDispatch();
  const { activity, activityLoading, error } = useSelector(
    (state) => state.user
  );

  useEffect(() => {
    dispatch(fetchUserActivity());
  }, [dispatch]);

  return {
    activity,
    loading: activityLoading,
    error,
    refetch: () => dispatch(fetchUserActivity()),
  };
};

/**
 * Hook to get rating history
 */
export const useRatingHistory = () => {
  const dispatch = useDispatch();
  const { ratingHistory, ratingHistoryLoading, error } = useSelector(
    (state) => state.user
  );

  useEffect(() => {
    dispatch(fetchUserRatingHistory());
  }, [dispatch]);

  return {
    ratingHistory,
    loading: ratingHistoryLoading,
    error,
    refetch: () => dispatch(fetchUserRatingHistory()),
  };
};
