import { useState } from "react";
import { LoginPage } from "./components/LoginPage";
import { SignUpPage } from "./components/SignUpPage";
import { Dashboard } from "./components/Schedule.tsx";
import { Toaster } from "./components/ui/sonner";
import { useAuth } from "@/context/AuthContext";

export default function App() {
  const { isAuthenticated, loading, logout } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      if (showSignUp) {
        return (
          <SignUpPage
            onSignUp={() => setShowSignUp(false)}
            onBackToLogin={() => setShowSignUp(false)}
          />
        );
      }
      return (
        <LoginPage
          onLogin={() => {}} // No-op, managed by context
          onSwitchToSignUp={() => setShowSignUp(true)}
        />
      );
    }

    return <Dashboard onLogout={logout} />;
  };

  return (
    <>
      {renderContent()}
      <Toaster />
    </>
  );
}
