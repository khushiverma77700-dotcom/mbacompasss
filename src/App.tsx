import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Index from "./pages/Index.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import InstitutePage from "./pages/InstitutePage.tsx";
import ComparePage from "./pages/ComparePage.tsx";
import BlogPage from "./pages/BlogPage.tsx";
import ArticlePage from "./pages/ArticlePage.tsx";
import CollegesPage from "./pages/CollegesPage.tsx";
import ExamDetailPage from "./pages/ExamDetailPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
