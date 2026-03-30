import { useParams } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";
import { useState, useEffect } from "react";
import axiosInstance from "../lib/axios";
import MyProfile from "../pages/MyProfile.jsx";
import PublicProfile from "../pages/PublicProfile.jsx";
import StaffProfile from "../pages/staff/StaffProfile.jsx";
import StaffPublicProfile from "../pages/staff/StaffPublicProfile.jsx";
import PageNotFound from "../pages/PageNotFound.jsx";

/**
 * ProfileRouter Component
 * Routes to appropriate profile page based on:
 * - User role (staff vs regular user)
 * - If viewing own profile (logged in) or public profile
 * - Staff: MyProfile/StaffProfile (own) or StaffPublicProfile (public via /staff/:staffId route ideally)
 * - Users: MyProfile (own) or PublicProfile (public)
 */
const ProfileRouter = () => {
  const { username } = useParams();
  const { isSignedIn } = useUser();
  const reduxProfile = useSelector((state) => state.user?.profile);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get current user's username and role
  const currentUserUsername = reduxProfile?.username;
  const currentUserRole = reduxProfile?.app_role;
  
  // Check if viewing own profile (case-insensitive comparison)
  const isOwnProfile = 
    isSignedIn && 
    currentUserUsername && 
    currentUserUsername.toLowerCase() === username?.toLowerCase();

  // Fetch profile data if not own profile (to determine role)
  useEffect(() => {
    if (!isOwnProfile && username) {
      const fetchProfile = async () => {
        try {
          setLoading(true);
          const response = await axiosInstance.get(`/api/users/public/${username}`);
          setProfileData(response.data);
        } catch (err) {
          setError('Profile not found');
          console.error('Error fetching profile:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [username, isOwnProfile]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-950 text-slate-50">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If viewing own profile
  if (isOwnProfile) {
    // Show staff profile if user is staff
    if (currentUserRole === 'staff') {
      return <StaffProfile />;
    }
    // Show regular user profile
    return <MyProfile />;
  }

  // If error or profile not found
  if (error || (!profileData && !isOwnProfile)) {
    return <PageNotFound />;
  }

  // If viewing someone else's profile
  if (profileData) {
    // Show staff public profile if they are staff
    if (profileData.app_role === 'staff') {
      return <StaffPublicProfile />;
    }
    // Show regular user public profile
    return <PublicProfile />;
  }

  return <PageNotFound />;
};

export default ProfileRouter;
