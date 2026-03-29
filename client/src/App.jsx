import { useUser } from "@clerk/clerk-react";
import { useSelector } from "react-redux";

import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import PageNotFound from "./pages/PageNotFound.jsx";
import ProblemsPage from "./pages/ProblemsPage.jsx";
import ProblemDetail from "./pages/ProblemDetail.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Judge0Health from "./pages/Judge0Health.jsx";
import Ide from "./pages/Ide.jsx";
import AllContests from "./pages/contest/AllContests.jsx";
import Contest from "./pages/contest/Contest.jsx";
import OngoingContest from "./pages/contest/OngoingContest.jsx";
import CodeEditor from "./pages/CodeEditor.jsx";
import Interview from "./pages/Interview.jsx";
import MySubmissions from "./pages/MySubmissions.jsx";
import AuthSync from "./components/AuthSync.jsx";
import ProfileRouter from "./components/ProfileRouter.jsx";
import Submission from "./pages/Submission.jsx";
import AllInterviews from "./pages/AllInterviews.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import StaffDashboard from "./pages/staff/StaffDashboard.jsx";
import StaffProfile from "./pages/staff/StaffProfile.jsx";
import StaffPublicProfile from "./pages/staff/StaffPublicProfile.jsx";
import StaffContests from "./pages/staff/StaffContests.jsx";
import StaffCreateContest from "./pages/staff/StaffCreateContest.jsx";
import StaffContestDetail from "./pages/staff/StaffContestDetail.jsx";
import StaffInterviews from "./pages/staff/StaffInterviews.jsx";
import StaffScheduleInterview from "./pages/staff/StaffScheduleInterview.jsx";
import StaffInterviewDetail from "./pages/staff/StaffInterviewDetail.jsx";

function App() {
  const { isSignedIn, isLoaded } = useUser();
  const profile = useSelector((state) => state.user?.profile);
  const profileLoading = useSelector((state) => state.user?.profileLoading);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show loading while profile is being fetched for signed-in users
  if (isSignedIn && profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-sm text-slate-300">Setting up your profile...</p>
        </div>
      </div>
    );
  }

  // Determine dashboard based on user role
  const getDashboard = () => {
    if (!isSignedIn) return <HomePage />;
    if (profile?.app_role === 'staff') return <StaffDashboard />;
    return <Dashboard />;
  };

  return (
    <>
      {/* Sync Clerk auth with Redux */}
      <AuthSync />

      <Routes>
        <Route path="/" element={getDashboard()} />
        <Route
          path="/onboarding"
          element={isSignedIn ? <Onboarding /> : <Navigate to="/" />}
        />
        <Route path="/problems" element={<ProblemsPage />} />
        <Route
          path="/problem/:id"
          element={isSignedIn ? <ProblemDetail /> : <Navigate to="/" />}
        />
        <Route
          path="/problem/:id/description"
          element={isSignedIn && profile?.app_role !== 'staff' ? <CodeEditor /> : <Navigate to="/" />}
        />
        <Route
          path="/ide"
          element={isSignedIn && profile?.app_role !== 'staff' ? <Ide /> : <Navigate to="/" />}
        />
        <Route path="/contests" element={<AllContests />} />
        <Route path="/contest/:id/info" element={<Contest />} />
        <Route
          path="/contest/:id/ongoing"
          element={isSignedIn && profile?.app_role !== 'staff' ? <OngoingContest /> : <Navigate to="/" />}
        />
        <Route
          path="/my-interviews"
          element={isSignedIn && profile?.app_role !== 'staff' ? <AllInterviews /> : <Navigate to="/" />}
        />
        <Route
          path="/interview/:interviewId"
          element={isSignedIn ? <Interview /> : <Navigate to="/" />}
        />
        <Route
          path="/my-submissions"
          element={isSignedIn && profile?.app_role !== 'staff' ? <MySubmissions /> : <Navigate to="/" />}
        />
        <Route
          path="/submissions/:submissionId"
          element={isSignedIn && profile?.app_role !== 'staff' ? <Submission /> : <Navigate to="/" />}
        />
        <Route path="/judge0-health" element={<Judge0Health />} />
        <Route
          path="/staff/dashboard"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffDashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/profile"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffProfile /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/contests"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffContests /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/contests/create"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffCreateContest /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/contests/:contestId"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffContestDetail /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/interviews"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffInterviews /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/interviews/schedule"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffScheduleInterview /> : <Navigate to="/" />}
        />
        <Route
          path="/staff/interviews/:interviewId"
          element={isSignedIn && profile?.app_role === 'staff' ? <StaffInterviewDetail /> : <Navigate to="/" />}
        />
        <Route path="/staff/:staffId" element={<StaffPublicProfile />} />
        <Route path="/profile/:username" element={<ProfileRouter />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </>
  );
}

export default App;
