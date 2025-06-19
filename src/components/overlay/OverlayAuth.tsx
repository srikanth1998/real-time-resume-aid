
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KeyRound, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OverlayAuthProps {
  onSessionConnect: (sessionId: string, sessionData: any) => void;
  onAccountConnect: (user: any, session: any) => void;
}

export const OverlayAuth = ({ onSessionConnect, onAccountConnect }: OverlayAuthProps) => {
  const [sessionCode, setSessionCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("session");

  const handleSessionConnect = async () => {
    if (!sessionCode.trim()) {
      toast.error("Please enter a session code");
      return;
    }

    setLoading(true);
    try {
      // Validate session code with backend
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_code', sessionCode.trim())
        .eq('status', 'active')
        .single();

      if (error || !data) {
        toast.error("Invalid or expired session code");
        return;
      }

      // Connect to session
      onSessionConnect(data.id, data);
      toast.success("Connected to interview session");
    } catch (error) {
      console.error('Session connect error:', error);
      toast.error("Failed to connect to session");
    } finally {
      setLoading(false);
    }
  };

  const handleAccountLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user && data.session) {
        onAccountConnect(data.user, data.session);
        toast.success("Successfully logged in");
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error("Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="backdrop-blur-md bg-glass border border-glass-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">
              InterviewAce Overlay
            </CardTitle>
            <p className="text-white/70">
              Connect to your interview session or account
            </p>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="session" className="text-sm">
                  <KeyRound className="h-4 w-4 mr-2" />
                  Session Code
                </TabsTrigger>
                <TabsTrigger value="account" className="text-sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Account Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="session" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionCode" className="text-white">
                    Enter Session Code
                  </Label>
                  <Input
                    id="sessionCode"
                    placeholder="Enter your 6-digit session code"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    maxLength={6}
                  />
                  <p className="text-xs text-white/60">
                    Get this code from your session ready page after payment
                  </p>
                </div>
                <Button
                  onClick={handleSessionConnect}
                  disabled={loading || !sessionCode.trim()}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Connect to Session
                </Button>
              </TabsContent>

              <TabsContent value="account" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAccountLogin}
                  disabled={loading || !email.trim() || !password.trim()}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Login to Account
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};
