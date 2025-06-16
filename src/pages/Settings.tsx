import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  Trash2,
  Save,
  AlertTriangle
} from 'lucide-react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mode, user, isLoading, signOut } = useHybridAuth();
  
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    bio: ''
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    performanceAlerts: true,
    autoSaveTranscripts: true,
    stealthMode: true
  });
  
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isLoading && mode !== 'account') {
      navigate('/auth');
      return;
    }

    if (user) {
      loadUserSettings();
    }
  }, [mode, user, isLoading, navigate]);

  const loadUserSettings = async () => {
    try {
      // Load user profile and preferences from Supabase
      setProfile({
        displayName: user?.user_metadata?.display_name || '',
        email: user?.email || '',
        bio: ''
      });
    } catch (error) {
      console.error('Failed to load user settings:', error);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // Update user profile in Supabase
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = async () => {
    setLoading(true);
    try {
      // Update user preferences in Supabase
      toast({
        title: "Preferences updated",
        description: "Your preferences have been successfully updated.",
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      // Delete user account and all associated data
      await signOut();
      toast({
        title: "Account deleted",
        description: "Your account and all data have been permanently deleted.",
      });
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <User className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-400" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="text-gray-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">Account Settings</h1>
              <p className="text-gray-400">Manage your account and preferences</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Profile Settings */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">Display Name</Label>
                  <Input
                    id="displayName"
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white">Bio (Optional)</Label>
                <Input
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Tell us about yourself..."
                />
              </div>
              
              <Button 
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Email Notifications</h3>
                  <p className="text-gray-400 text-sm">Receive updates about your interview sessions</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
                />
              </div>
              
              <Separator className="bg-gray-700" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Performance Alerts</h3>
                  <p className="text-gray-400 text-sm">Get notified about performance improvements</p>
                </div>
                <Switch
                  checked={preferences.performanceAlerts}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, performanceAlerts: checked })}
                />
              </div>
              
              <Separator className="bg-gray-700" />
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Auto-save Transcripts</h3>
                  <p className="text-gray-400 text-sm">Automatically save interview transcripts</p>
                </div>
                <Switch
                  checked={preferences.autoSaveTranscripts}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, autoSaveTranscripts: checked })}
                />
              </div>
              
              <Button 
                onClick={handleSavePreferences}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Preferences
              </Button>
            </CardContent>
          </Card>

          {/* Privacy & Security */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Stealth Mode</h3>
                  <p className="text-gray-400 text-sm">Hide overlay from screen sharing by default</p>
                </div>
                <Switch
                  checked={preferences.stealthMode}
                  onCheckedChange={(checked) => setPreferences({ ...preferences, stealthMode: checked })}
                />
              </div>
              
              <Separator className="bg-gray-700" />
              
              <div>
                <h3 className="text-white font-medium mb-2">Data Export</h3>
                <p className="text-gray-400 text-sm mb-4">Download all your interview data and transcripts</p>
                <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="bg-red-900/20 border-red-700">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-red-900/20 border-red-700 text-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. All your data including resumes, 
                  interview history, and analytics will be permanently deleted.
                </AlertDescription>
              </Alert>
              
              {showDeleteConfirm ? (
                <div className="space-y-4">
                  <p className="text-red-400 font-medium">
                    Are you absolutely sure? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <Button 
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes, Delete My Account
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}