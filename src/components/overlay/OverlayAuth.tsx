
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface OverlayAuthProps {
  onSessionConnected: (sessionData: any) => void;
  onAccountConnected: (userData: any) => void;
}

export const OverlayAuth = ({ onSessionConnected, onAccountConnected }: OverlayAuthProps) => {
  const [sessionCode, setSessionCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSessionCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Find session by code
      const { data: session, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_code', sessionCode.trim())
        .eq('status', 'assets_received')
        .single();

      if (error || !session) {
        toast({
          title: "Invalid Session Code",
          description: "Session code not found or session is not ready",
          variant: "destructive"
        });
        return;
      }

      // Check if session is still valid (not expired)
      const now = new Date();
      const expiresAt = new Date(session.expires_at);
      
      if (now >= expiresAt) {
        toast({
          title: "Session Expired",
          description: "This session has expired",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Connected",
        description: "Successfully connected to interview session"
      });

      onSessionConnected(session);
    } catch (error) {
      console.error('Session connection error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to session",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      if (data.user) {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        toast({
          title: "Logged In",
          description: "Successfully logged into your account"
        });

        onAccountConnected({
          user: data.user,
          profile: profile
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Error",
        description: "Failed to log in",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl">Overlay Assistant</CardTitle>
          <p className="text-gray-400">Connect to your interview session</p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="session-code" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700">
              <TabsTrigger value="session-code" className="text-white data-[state=active]:bg-gray-600">
                Session Code
              </TabsTrigger>
              <TabsTrigger value="account" className="text-white data-[state=active]:bg-gray-600">
                Account Login
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="session-code" className="space-y-4">
              <form onSubmit={handleSessionCodeSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="session-code" className="text-white">
                    Enter Session Code
                  </Label>
                  <Input
                    id="session-code"
                    type="text"
                    placeholder="Enter your session code"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-gray-400 mt-1">
                    You'll receive this code after completing payment and upload
                  </p>
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect to Session'
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="account" className="space-y-4">
              <form onSubmit={handleAccountLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email" className="text-white">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label htmlFor="password" className="text-white">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    'Login to Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
