
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import Personalize from "./pages/Personalize";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useEffect } from "react";

const queryClient = new QueryClient();

// Protected route component for admin access - modified to not redirect immediately
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isAdmin } = useAuth();
  
  useEffect(() => {
    console.log("AdminRoute check:", { currentUser, isAdmin: isAdmin() });
  }, [currentUser]);
  
  // Always render Admin page - authentication will be handled inside the component
  return <>{children}</>;
};

// App wrapper with Auth provider
const AppWithAuth = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/personalize" element={<Personalize />} />
          <Route path="/chat" element={<Chat />} />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            } 
          />
          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppWithAuth />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
