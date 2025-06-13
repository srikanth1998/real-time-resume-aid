
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import Upload from "./pages/Upload";
import Lobby from "./pages/Lobby";
import Interview from "./pages/Interview";
import Complete from "./pages/Complete";
import MobileCompanion from "./pages/MobileCompanion";
import { Downloads } from "./pages/Downloads";
import NotFound from "./pages/NotFound";
import HowItWorks from "./pages/HowItWorks";
import FAQ from "./pages/FAQ";
import Integrity from "./pages/Integrity";
import SessionReady from "./pages/SessionReady";
import PostInterview from "./pages/PostInterview";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/integrity" element={<Integrity />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/lobby" element={<Lobby />} />
            <Route path="/session-ready" element={<SessionReady />} />
            <Route path="/interview" element={<Interview />} />
            <Route path="/complete" element={<Complete />} />
            <Route path="/post-interview" element={<PostInterview />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/mobile" element={<MobileCompanion />} />
            <Route path="/mobile-companion" element={<MobileCompanion />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
