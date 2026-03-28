import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import InstitutePage from "./pages/InstitutePage";
import ComparePage from "./pages/ComparePage";
import BlogPage from "./pages/BlogPage";
import ArticlePage from "./pages/ArticlePage";
import CollegesPage from "./pages/CollegesPage";
import ExamDetailPage from "./pages/ExamDetailPage";
import AuthPage from "./pages/AuthPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminInstitutes from "./pages/admin/AdminInstitutes";
import AdminArticles from "./pages/admin/AdminArticles";
import AdminBanners from "./pages/admin/AdminBanners";
import AdminInquiries from "./pages/admin/AdminInquiries";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Admin routes - no navbar/footer */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="institutes" element={<AdminInstitutes />} />
              <Route path="articles" element={<AdminArticles />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="inquiries" element={<AdminInquiries />} />
            </Route>

            {/* Public routes with navbar/footer */}
            <Route path="*" element={
              <>
                <Navbar />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/category/:slug" element={<CategoryPage />} />
                  <Route path="/institute/:slug" element={<InstitutePage />} />
                  <Route path="/compare" element={<ComparePage />} />
                  <Route path="/blog" element={<BlogPage />} />
                  <Route path="/article/:id" element={<ArticlePage />} />
                  <Route path="/colleges" element={<CollegesPage />} />
                  <Route path="/exam/:slug" element={<ExamDetailPage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <Footer />
              </>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
