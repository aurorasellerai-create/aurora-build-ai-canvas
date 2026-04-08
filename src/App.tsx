import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useMonitoring } from "@/hooks/useMonitoring";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateHub = lazy(() => import("./pages/CreateHub"));
const CreateFromScratch = lazy(() => import("./pages/CreateFromScratch"));
const ConvertSite = lazy(() => import("./pages/ConvertSite"));
const ConvertFile = lazy(() => import("./pages/ConvertFile"));
const Generator = lazy(() => import("./pages/Generator"));
const Processing = lazy(() => import("./pages/Processing"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Tools = lazy(() => import("./pages/Tools"));
const BusinessGenerator = lazy(() => import("./pages/BusinessGenerator"));
const Admin = lazy(() => import("./pages/Admin"));
const Credits = lazy(() => import("./pages/Credits"));
const VideoGenerator = lazy(() => import("./pages/VideoGenerator"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const MonitoringInit = () => {
  useMonitoring();
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <MonitoringInit />
        <BrowserRouter>
          <ErrorBoundary>
            <Suspense fallback={<Loading />}>
              <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/generator" element={<ProtectedRoute><CreateHub /></ProtectedRoute>} />
              <Route path="/generator/create" element={<ProtectedRoute><CreateFromScratch /></ProtectedRoute>} />
              <Route path="/generator/site" element={<ProtectedRoute><ConvertSite /></ProtectedRoute>} />
              <Route path="/generator/convert" element={<ProtectedRoute><ConvertFile /></ProtectedRoute>} />
              <Route path="/generator/legacy" element={<ProtectedRoute><Generator /></ProtectedRoute>} />
              <Route path="/processing/:id" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
              <Route path="/project/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
              <Route path="/business" element={<ProtectedRoute><BusinessGenerator /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/video" element={<ProtectedRoute><VideoGenerator /></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
