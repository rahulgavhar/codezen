import { useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import MyProfile from "../pages/MyProfile.jsx";
import PublicProfile from "../pages/PublicProfile.jsx";

/**
 * ProfileRouter Component
 * Routes to appropriate profile page based on:
 * - If viewing own profile (logged in) -> MyProfile
 * - If viewing someone else's profile -> PublicProfile
 * - If username not found -> PageNotFound
 */
const ProfileRouter = () => {
  const { username } = useParams();
  const { isSignedIn } = useUser();
  const reduxProfile = useSelector((state) => state.user?.profile);
  
  // Get current user's username
  const currentUserUsername = reduxProfile?.username;
  
  // Check if viewing own profile (case-insensitive comparison)
  const isOwnProfile = 
    isSignedIn && 
    currentUserUsername && 
    currentUserUsername.toLowerCase() === username?.toLowerCase();

  // If logged in and viewing own profile, show edit-able version
  if (isOwnProfile) {
    return <MyProfile />;
  }

  // Otherwise show public profile (which handles 404 if not found)
  return <PublicProfile />;
};

export default ProfileRouter;
