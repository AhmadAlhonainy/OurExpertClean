import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Home from "@/pages/Home";
import CreateExperience from "@/pages/CreateExperience";
import ExperienceDetail from "@/pages/ExperienceDetail";
import Payment from "@/pages/Payment";
import LearnerDashboard from "@/pages/LearnerDashboard";
import MentorDashboard from "@/pages/MentorDashboard";
import MentorStripeConnect from "@/pages/MentorStripeConnect";
import AdminDashboard from "@/pages/AdminDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import BookExperience from "@/pages/BookExperience";
import SignIn from "@/pages/SignIn";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import RoleSelection from "@/pages/RoleSelection";
import Messages from "@/pages/Messages";
import MentorProfile from "@/pages/MentorProfile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/signin" component={SignIn} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/role-selection" component={RoleSelection} />
      <Route path="/experiences" component={BookExperience} />
      <Route path="/become-mentor" component={CreateExperience} />
      <Route path="/create-experience" component={CreateExperience} />
      <Route path="/experience/:id" component={ExperienceDetail} />
      <Route path="/mentor/stripe-connect" component={MentorStripeConnect} />
      <Route path="/mentor/:id" component={MentorProfile} />
      <Route path="/payment/:id" component={Payment} />
      <Route path="/dashboard/learner" component={LearnerDashboard} />
      <Route path="/dashboard/mentor" component={MentorDashboard} />
      <Route path="/dashboard/admin" component={AdminDashboard} />
      <Route path="/dashboard/manager" component={ManagerDashboard} />
      <Route path="/messages" component={Messages} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthRefreshHandler() {
  useEffect(() => {
    // Refetch auth on page focus to ensure we have fresh user data
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthRefreshHandler />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
