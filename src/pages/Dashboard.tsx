import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Plus, 
  Clock, 
  FileText, 
  TrendingUp, 
  Settings,
  Zap,
  History,
  User,
  LogOut
} from 'lucide-react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    mode,
    user,
    session,
    sessionId,
    isLoading,
    signOut,
    endSession
  } = useHybridAuth();

  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalQuestions: 0,
    avgScore: 0,
    resumeCount: 0
  });

  useEffect(() => {
    // If no active session or user, redirect to auth
    if (!isLoading && !sessionId && !user) {
      navigate('/auth');
      return;
    }

    // Load dashboard data based on mode
    loadDashboardData();
  }, [mode, sessionId, user, isLoading, navigate]);

  const loadDashboardData = async () => {
    try {
      if (mode === 'account' && user) {
        // Load user's persistent data from Supabase
        // This would fetch from interview_sessions, resumes, etc.
        setStats({
          totalSessions: 12,
          totalQuestions: 156,
          avgScore: 8.4,
          resumeCount: 3
        });
        setRecentSessions([
          { id: '1', company: 'Google', position: 'Software Engineer', date: '2024-01-15', status: 'completed' },
          { id: '2', company: 'Microsoft', position: 'Senior Developer', date: '2024-01-10', status: 'completed' },
        ]);
      } else {
        // Session mode - show limited local data
        setStats({
          totalSessions: 1,
          totalQuestions: 0,
          avgScore: 0,
          resumeCount: 0
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleEndSession = () => {
    endSession();
    toast({
      title: "Session ended",
      description: "Your local session has been cleared.",
    });
    navigate('/');
  };

  const startNewInterview = () => {
    navigate('/upload');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-400" />
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-xl font-bold text-white">InterviewAce</h1>
              <div className="flex items-center space-x-2">
                <Badge variant={mode === 'account' ? 'default' : 'secondary'} className="text-xs">
                  {mode === 'account' ? 'Account Mode' : 'Session Mode'}
                </Badge>
                {mode === 'account' && user?.email && (
                  <span className="text-sm text-gray-400">{user.email}</span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {mode === 'account' ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate('/settings')} className="text-gray-300">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-300">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={handleEndSession} className="text-gray-300">
                <LogOut className="h-4 w-4 mr-2" />
                End Session
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer" onClick={startNewInterview}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <h3 className="font-semibold text-white">Start Interview</h3>
                  <p className="text-sm text-gray-400">Begin a new practice session</p>
                </div>
                <div className="bg-blue-600 p-3 rounded-full">
                  <Plus className="h-6 w-6 text-white" />
                </div>
              </CardContent>
            </Card>

            {mode === 'account' && (
              <>
                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer" onClick={() => navigate('/resumes')}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <h3 className="font-semibold text-white">Manage Resumes</h3>
                      <p className="text-sm text-gray-400">{stats.resumeCount} resumes stored</p>
                    </div>
                    <div className="bg-green-600 p-3 rounded-full">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors cursor-pointer" onClick={() => navigate('/analytics')}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div>
                      <h3 className="font-semibold text-white">View Analytics</h3>
                      <p className="text-sm text-gray-400">Performance insights</p>
                    </div>
                    <div className="bg-purple-600 p-3 rounded-full">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        {/* Stats Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Total Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalSessions}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Questions Answered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalQuestions}</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Avg Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.avgScore}/10</div>
              </CardContent>
            </Card>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">Resumes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.resumeCount}</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Activity */}
        {mode === 'account' && recentSessions.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Recent Sessions</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')} className="text-blue-400">
                <History className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
            
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-0">
                {recentSessions.map((session: any, index) => (
                  <div key={session.id} className={`p-4 ${index !== recentSessions.length - 1 ? 'border-b border-gray-700' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{session.company} - {session.position}</h3>
                        <p className="text-sm text-gray-400">{session.date}</p>
                      </div>
                      <Badge 
                        variant={session.status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upgrade Prompt for Session Mode */}
        {mode === 'session' && (
          <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Unlock More Features</h3>
                  <p className="text-gray-300 mb-4">
                    Create an account to save multiple resumes, view performance analytics, and access interview history.
                  </p>
                  <Button 
                    onClick={() => navigate('/auth')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </div>
                <div className="hidden md:block">
                  <div className="bg-blue-600/20 p-4 rounded-full">
                    <Zap className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}