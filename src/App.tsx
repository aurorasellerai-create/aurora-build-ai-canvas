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
import { initAnalytics } from "@/lib/analytics";
import InstallBanner from "@/components/InstallBanner";

const Index = lazy(() => import(/* webpackChunkName: "landing" */ "./pages/Index"));
const Auth = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/Auth"));
const ForgotPassword = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/ForgotPassword"));
const ResetPassword = lazy(() => import(/* webpackChunkName: "auth" */ "./pages/ResetPassword"));
const Dashboard = lazy(() => import(/* webpackChunkName: "dashboard" */ "./pages/Dashboard"));
const CreateHub = lazy(() => import(/* webpackChunkName: "generator" */ "./pages/CreateHub"));
const CreateFromScratch = lazy(() => import(/* webpackChunkName: "generator" */ "./pages/CreateFromScratch"));
const ConvertSite = lazy(() => import(/* webpackChunkName: "generator" */ "./pages/ConvertSite"));
const ConvertFile = lazy(() => import(/* webpackChunkName: "generator" */ "./pages/ConvertFile"));
const ConvertToAAB = lazy(() => import(/* webpackChunkName: "generator" */ "./pages/ConvertToAAB"));
const Generator = lazy(() => import(/* webpackChunkName: "generator" */ "./pages/Generator"));
const Processing = lazy(() => import(/* webpackChunkName: "processing" */ "./pages/Processing"));
const ProjectDetail = lazy(() => import(/* webpackChunkName: "project" */ "./pages/ProjectDetail"));
const Pricing = lazy(() => import(/* webpackChunkName: "pricing" */ "./pages/Pricing"));
const AppPreview = lazy(() => import(/* webpackChunkName: "preview" */ "./pages/AppPreview"));
const Tools = lazy(() => import(/* webpackChunkName: "tools" */ "./pages/Tools"));
const BusinessGenerator = lazy(() => import(/* webpackChunkName: "business" */ "./pages/BusinessGenerator"));
const Admin = lazy(() => import(/* webpackChunkName: "admin" */ "./pages/Admin"));
const Credits = lazy(() => import(/* webpackChunkName: "credits" */ "./pages/Credits"));
const VideoGenerator = lazy(() => import(/* webpackChunkName: "video" */ "./pages/VideoGenerator"));
const CarouselGenerator = lazy(() => import(/* webpackChunkName: "carousel" */ "./pages/CarouselGenerator"));
const ValidatorDetail = lazy(() => import(/* webpackChunkName: "validator" */ "./pages/ValidatorDetail"));
const ConversionHistory = lazy(() => import(/* webpackChunkName: "history" */ "./pages/ConversionHistory"));
const NotFound = lazy(() => import(/* webpackChunkName: "notfound" */ "./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

initAnalytics();

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
              <Route path="/generator/convert-aab" element={<ProtectedRoute><ConvertToAAB /></ProtectedRoute>} />
              <Route path="/converter-app" element={<ProtectedRoute><ConvertToAAB /></ProtectedRoute>} />
              <Route path="/generator/legacy" element={<ProtectedRoute><Generator /></ProtectedRoute>} />
              <Route path="/processing/:id" element={<ProtectedRoute><Processing /></ProtectedRoute>} />
              <Route path="/project/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/preview/:slug" element={<AppPreview />} />
              <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
              <Route path="/business" element={<ProtectedRoute><BusinessGenerator /></ProtectedRoute>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/video" element={<ProtectedRoute><VideoGenerator /></ProtectedRoute>} />
              <Route path="/carousel" element={<ProtectedRoute><CarouselGenerator /></ProtectedRoute>} />
              <Route path="/validator/:id" element={<ProtectedRoute><ValidatorDetail /></ProtectedRoute>} />
              <Route path="/credits" element={<ProtectedRoute><Credits /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute><ConversionHistory /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
        <InstallBanner />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
