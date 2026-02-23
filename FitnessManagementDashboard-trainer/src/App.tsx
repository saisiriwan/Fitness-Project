import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider, useAuth } from "./components/page/Trainer/AuthContext";
import SignIn from "./components/SignIn";
// Trainer Components
import Dashboard from "@/components/page/Trainer/Dashboard";
import ClientsList from "./components/page/Trainer/ClientsList";
import ClientProfile from "@/components/page/Trainer/ClientProfilePage";
import Calendar from "@/components/page/Trainer/Calendar";
import SessionLog from "@/components/page/Trainer/SessionLog";
import AddSession from "@/components/page/Trainer/AddSession";
import ProgramBuilderSectionBased from "@/components/page/Trainer/ProgramBuilderSectionBased";
import ExerciseLibrary from "@/components/page/Trainer/ExerciseLibrary";
import Reports from "@/components/page/Trainer/Reports";
import Settings from "@/components/page/Trainer/Settings";
import DashboardLayout from "@/components/DashboardLayout";

// Trainee Components (Commented out - files don't exist yet)
// import TraineeDashboardPage from "./components/page/Trainee/TraineeDashboard";
// import ScheduleView from "./components/page/Trainee/ScheduleView";
// import ProgressView from "./components/page/Trainee/ProgressView";
// import SessionSummary from "./components/page/Trainee/SessionSummary";
// import TraineeSettings from "./components/page/Trainee/Settings";

// --- Route Guards ---

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (isAuthenticated) {
    if (user?.role === "trainer") {
      return <Navigate to="/trainer/dashboard" replace />;
    }
    // If authenticated but NOT a trainer (e.g. trainee logged in on same localhost)
    // Do NOT redirect to trainer dashboard.
    // Instead, we might want to show a "Wrong Portal" message or just let them see the SignIn page
    // where they can choose to logout.
    // For now, let's render children (SignIn) so they can click "Switch Account" or Logout if we record it.
    // Or better, force logout? But that disrupts the other tab.
    // Safest: Render children (SignIn) allowing them to see standard page,
    // maybe show a warning "You are logged in as Trainee".
    return <>{children}</>;
  }
  return <>{children}</>;
}

function TrainerRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (user?.role !== "trainer") {
    // If logged in but not a trainer, redirect to signin for now
    return <Navigate to="/signin" replace />;
  }

  return <DashboardLayout userType="trainer">{children}</DashboardLayout>;
}

// TraineeRoute commented out - Trainee components don't exist yet
// function TraineeRoute({ children }: { children: React.ReactNode }) {
//   const { isAuthenticated, user, loading } = useAuth();
//
//   if (loading) return <div>Loading...</div>;
//
//   if (!isAuthenticated) {
//     return <Navigate to="/signin" replace />;
//   }
//
//   if (user?.role !== "trainee") {
//     return <Navigate to="/trainer/dashboard" replace />;
//   }
//
//   return <DashboardLayout userType="trainee">{children}</DashboardLayout>;
// }

// --- App ---

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            {/* Public Entry */}
            <Route
              path="/signin"
              element={
                <PublicRoute>
                  <SignIn />
                </PublicRoute>
              }
            />

            {/* Trainer Routes */}
            <Route
              path="/trainer/dashboard"
              element={
                <TrainerRoute>
                  <Dashboard />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/clients"
              element={
                <TrainerRoute>
                  <ClientsList />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/clients/:id"
              element={
                <TrainerRoute>
                  <ClientProfile />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/calendar"
              element={
                <TrainerRoute>
                  <Calendar />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/sessions/:id/log"
              element={
                <TrainerRoute>
                  <SessionLog />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/session-log"
              element={
                <TrainerRoute>
                  <SessionLog />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/sessions/new"
              element={
                <TrainerRoute>
                  <AddSession />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/programs"
              element={
                <TrainerRoute>
                  <ProgramBuilderSectionBased />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/library/exercises"
              element={
                <TrainerRoute>
                  <ExerciseLibrary />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/reports"
              element={
                <TrainerRoute>
                  <Reports />
                </TrainerRoute>
              }
            />
            <Route
              path="/trainer/settings"
              element={
                <TrainerRoute>
                  <Settings />
                </TrainerRoute>
              }
            />

            {/* Trainee Routes - Commented out until components are created */}
            {/* <Route
              path="/trainee/dashboard"
              element={
                <TraineeRoute>
                  <TraineeDashboardPage />
                </TraineeRoute>
              }
            />
            <Route
              path="/trainee/schedule"
              element={
                <TraineeRoute>
                  <ScheduleView />
                </TraineeRoute>
              }
            />
            <Route
              path="/trainee/progress"
              element={
                <TraineeRoute>
                  <ProgressView />
                </TraineeRoute>
              }
            />
            <Route
              path="/trainee/sessions"
              element={
                <TraineeRoute>
                  <SessionSummary />
                </TraineeRoute>
              }
            />
            <Route
              path="/trainee/settings"
              element={
                <TraineeRoute>
                  <TraineeSettings />
                </TraineeRoute>
              }
            /> */}

            {/* Root & Catch-all */}
            <Route path="/" element={<Navigate to="/signin" replace />} />
            {/* Redirect legacy /dashboard to /trainer/dashboard to be safe, or just catch-all */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
