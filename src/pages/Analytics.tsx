import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  TrendingUp, 
  Clock, 
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Filter
} from 'lucide-react';
import { useHybridAuth } from '@/hooks/useHybridAuth';

interface SessionData {
  id: string;
  company: string;
  position: string;
  date: string;
  duration: number;
  questionsAnswered: number;
  averageResponseTime: number;
  performance: number;
  status: 'completed' | 'in-progress' | 'cancelled';
}

export default function Analytics() {
  const navigate = useNavigate();
  const { mode, user, isLoading } = useHybridAuth();
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    if (!isLoading && mode !== 'account') {
      navigate('/auth');
      return;
    }

    if (user) {
      loadAnalytics();
    }
  }, [mode, user, isLoading, navigate, timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Simulate loading analytics data from Supabase
      const mockSessions: SessionData[] = [
        {
          id: '1',
          company: 'Google',
          position: 'Software Engineer',
          date: '2024-01-15',
          duration: 45,
          questionsAnswered: 12,
          averageResponseTime: 2.3,
          performance: 8.5,
          status: 'completed'
        },
        {
          id: '2',
          company: 'Microsoft',
          position: 'Senior Developer',
          date: '2024-01-10',
          duration: 60,
          questionsAnswered: 15,
          averageResponseTime: 1.8,
          performance: 9.2,
          status: 'completed'
        },
        {
          id: '3',
          company: 'Amazon',
          position: 'Full Stack Engineer',
          date: '2024-01-05',
          duration: 35,
          questionsAnswered: 8,
          averageResponseTime: 3.1,
          performance: 7.8,
          status: 'completed'
        }
      ];
      
      setSessions(mockSessions);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        averagePerformance: 0,
        totalQuestions: 0,
        averageResponseTime: 0,
        totalDuration: 0
      };
    }

    const totalSessions = sessions.length;
    const totalQuestions = sessions.reduce((sum, s) => sum + s.questionsAnswered, 0);
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const averagePerformance = sessions.reduce((sum, s) => sum + s.performance, 0) / totalSessions;
    const averageResponseTime = sessions.reduce((sum, s) => sum + s.averageResponseTime, 0) / totalSessions;

    return {
      totalSessions,
      averagePerformance,
      totalQuestions,
      averageResponseTime,
      totalDuration
    };
  };

  const stats = calculateStats();

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <BarChart3 className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-400" />
          <p>Loading your analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold text-white">Performance Analytics</h1>
                <p className="text-gray-400">Track your interview performance over time</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 text-white rounded-md px-3 py-1 text-sm"
              >
                <option value="week">Past Week</option>
                <option value="month">Past Month</option>
                <option value="quarter">Past Quarter</option>
                <option value="year">Past Year</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium text-gray-400">Avg Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.averagePerformance.toFixed(1)}/10</div>
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
              <CardTitle className="text-sm font-medium text-gray-400">Avg Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.averageResponseTime.toFixed(1)}s</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">Total Practice Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m</div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Trend Chart Placeholder */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Performance Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
              <div className="text-center text-gray-400">
                <PieChart className="h-12 w-12 mx-auto mb-2" />
                <p>Performance chart visualization</p>
                <p className="text-sm">Chart component would be integrated here</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Session History */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Session History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {sessions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-4" />
                <p>No interview sessions found for the selected time range.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {sessions.map((session) => (
                  <div key={session.id} className="p-4 hover:bg-gray-750 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-white">{session.company} - {session.position}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
                          <span className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(session.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {session.duration}min
                          </span>
                          <span className="flex items-center">
                            <Target className="h-3 w-3 mr-1" />
                            {session.questionsAnswered} questions
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-white">
                          {session.performance.toFixed(1)}/10
                        </div>
                        <Badge 
                          variant={session.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {session.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}