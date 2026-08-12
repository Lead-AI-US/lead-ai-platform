import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { WorkspaceProvider } from "@/lib/workspace/WorkspaceProvider";
import { ProtectedRoute, RequireAuthOnly } from "@/lib/auth/ProtectedRoute";
import AppLayout from "@/app/AppLayout";

const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const Customers = lazy(() => import("@/pages/app/Customers"));
const CustomerProfile = lazy(() => import("@/pages/app/CustomerProfile"));
const Leads = lazy(() => import("@/pages/app/Leads"));
const Conversations = lazy(() => import("@/pages/app/Conversations"));
const Knowledge = lazy(() => import("@/pages/app/Knowledge"));
const Analytics = lazy(() => import("@/pages/app/Analytics"));
const Settings = lazy(() => import("@/pages/app/Settings"));
const AIAgent = lazy(() => import("@/pages/app/AIAgent"));
const Automations = lazy(() => import("@/pages/app/Automations"));
const Integrations = lazy(() => import("@/pages/app/Integrations"));
const AIAssets = lazy(() => import("@/pages/app/AIAssets"));
const Developer = lazy(() => import("@/pages/app/Developer"));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
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
                  <Route path="inbox" element={<Conversations />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:customerId" element={<CustomerProfile />} />
                  <Route path="leads" element={<Leads />} />
                  <Route path="conversations" element={<Conversations />} />
                  <Route path="ai-agent" element={<AIAgent />} />
                  <Route path="knowledge" element={<Knowledge />} />
                  <Route path="automations" element={<Automations />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="ai-assets" element={<AIAssets />} />
                  <Route path="developer" element={<Developer />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
