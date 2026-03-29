import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUserProfile, clearUser } from '../redux/slices/userSlice';

/**
 * AuthSync Component
 * Synchronizes Clerk authentication state with Redux store
 * - Fetches user profile when user signs in
 * - Redirects to onboarding if app_role is not set
 * - Clears Redux store when user signs out
 */
const AuthSync = () => {
  const { isSignedIn, isLoaded } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.user?.profile);
  const profileLoading = useSelector((state) => state.user?.profileLoading);
  const error = useSelector((state) => state.user?.error);

  useEffect(() => {
    // Wait for Clerk to load
    if (!isLoaded) return;

    // User is signed in and profile not yet fetched
    if (isSignedIn && !profile && !profileLoading) {
      console.log('🔄 AuthSync: Fetching user profile...');
      dispatch(fetchUserProfile())
        .unwrap()
        .then((data) => {
          console.log('✅ AuthSync: Profile loaded:', data);
        })
        .catch((error) => {
          console.error('❌ AuthSync: Failed to load user profile:', error);
        });
    }

    // User signed out - clear Redux store
    if (!isSignedIn && profile) {
      console.log('👋 AuthSync: User signed out, clearing profile');
      dispatch(clearUser());
    }
  }, [isSignedIn, isLoaded, profile, profileLoading, dispatch]);

  // Redirect to onboarding if profile loaded but app_role not set
  useEffect(() => {
    if (isSignedIn && profile && !profileLoading) {
      console.log('🎯 AuthSync: Profile loaded, checking app_role:', {
        app_role: profile.app_role,
        path: location.pathname,
      });

      // Profile is fully loaded
      if (profile.app_role === null || profile.app_role === undefined) {
        // User hasn't completed onboarding
        console.log('📋 AuthSync: User needs onboarding, redirecting to /onboarding');
        if (location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      } else {
        // User has completed onboarding, redirect from onboarding if there
        console.log('✨ AuthSync: User has role:', profile.app_role);
        if (location.pathname === '/onboarding') {
          console.log('📍 AuthSync: Redirecting from onboarding to dashboard');
          navigate('/', { replace: true });
        }
      }
    }
  }, [isSignedIn, profile, profileLoading, navigate, location.pathname]);

  // This component doesn't render anything
  return null;
};

export default AuthSync;
