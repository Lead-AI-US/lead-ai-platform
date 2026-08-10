import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { WorkspaceProvider } from "@/lib/workspace/WorkspaceProvider";
import { ProtectedRoute, RequireAuthOnly } from "@/lib/auth/ProtectedRoute";
import AppLayout from "@/app/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Onboarding from "@/pages/Onboarding";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/app/Dashboard";
import Leads from "@/pages/app/Leads";
import Conversations from "@/pages/app/Conversations";
import Knowledge from "@/pages/app/Knowledge";
import Analytics from "@/pages/app/Analytics";
import Settings from "@/pages/app/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            <Route element={<RequireAuthOnly />}>
              <Route path="/onboarding" element={<Onboarding />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="leads" element={<Leads />} />
                <Route path="conversations" element={<Conversations />} />
                <Route path="knowledge" element={<Knowledge />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
