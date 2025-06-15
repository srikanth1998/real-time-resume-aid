import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  FileText, 
  Plus, 
  Edit, 
  Trash, 
  Star,
  Upload,
  Eye
} from 'lucide-react';
import { useHybridAuth } from '@/hooks/useHybridAuth';
import { useToast } from '@/hooks/use-toast';

interface Resume {
  id: string;
  title: string;
  content: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export default function Resumes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mode, user, isLoading } = useHybridAuth();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && mode !== 'account') {
      navigate('/auth');
      return;
    }

    if (user) {
      loadResumes();
    }
  }, [mode, user, isLoading, navigate]);

  const loadResumes = async () => {
    try {
      setLoading(true);
      // Simulate loading resumes from Supabase
      // In real implementation, this would fetch from the resumes table
      const mockResumes: Resume[] = [
        {
          id: '1',
          title: 'Software Engineer Resume',
          content: 'Senior Software Engineer with 5+ years experience...',
          is_primary: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2', 
          title: 'Frontend Developer Resume',
          content: 'Frontend Developer specializing in React and TypeScript...',
          is_primary: false,
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        }
      ];
      
      setResumes(mockResumes);
    } catch (error) {
      console.error('Failed to load resumes:', error);
      toast({
        title: "Error",
        description: "Failed to load resumes. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (resumeId: string) => {
    try {
      // Update primary resume in database
      setResumes(prev => prev.map(resume => ({
        ...resume,
        is_primary: resume.id === resumeId
      })));
      
      toast({
        title: "Primary resume updated",
        description: "This resume will be used by default in interviews.",
      });
    } catch (error) {
      console.error('Failed to set primary resume:', error);
      toast({
        title: "Error",
        description: "Failed to update primary resume.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (!confirm('Are you sure you want to delete this resume?')) {
      return;
    }

    try {
      setResumes(prev => prev.filter(resume => resume.id !== resumeId));
      toast({
        title: "Resume deleted",
        description: "The resume has been permanently deleted.",
      });
    } catch (error) {
      console.error('Failed to delete resume:', error);
      toast({
        title: "Error",
        description: "Failed to delete resume.",
        variant: "destructive"
      });
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <FileText className="h-12 w-12 animate-pulse mx-auto mb-4 text-blue-400" />
          <p>Loading your resumes...</p>
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
                <h1 className="text-2xl font-bold text-white">Resume Management</h1>
                <p className="text-gray-400">Manage your resumes for different positions</p>
              </div>
            </div>
            
            <Button 
              onClick={() => navigate('/upload')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload Resume
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {resumes.length === 0 ? (
          <div className="text-center py-12">
            <Card className="bg-gray-800 border-gray-700 max-w-md mx-auto">
              <CardContent className="p-8 text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-semibold text-white mb-2">No Resumes Yet</h3>
                <p className="text-gray-400 mb-6">
                  Upload your first resume to get started with personalized interview assistance.
                </p>
                <Button 
                  onClick={() => navigate('/upload')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resume
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Tips */}
            <Alert className="bg-blue-900/20 border-blue-700 text-blue-200">
              <FileText className="h-4 w-4" />
              <AlertDescription>
                <strong>Tip:</strong> Set one resume as primary to use it by default in interviews. 
                You can always switch resumes when starting a new session.
              </AlertDescription>
            </Alert>

            {/* Resume Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumes.map((resume) => (
                <Card key={resume.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-white text-lg">{resume.title}</CardTitle>
                      {resume.is_primary && (
                        <Badge className="bg-yellow-600 text-yellow-100">
                          <Star className="h-3 w-3 mr-1" />
                          Primary
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-400">
                      <p>Created: {new Date(resume.created_at).toLocaleDateString()}</p>
                      {resume.updated_at !== resume.created_at && (
                        <p>Updated: {new Date(resume.updated_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-300">
                      <p className="truncate">{resume.content.substring(0, 100)}...</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      
                      <Button 
                        size="sm" 
                        variant="secondary"
                        className="bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      
                      {!resume.is_primary && (
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleSetPrimary(resume.id)}
                          className="bg-yellow-700 hover:bg-yellow-600 text-white"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          Set Primary
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteResume(resume.id)}
                        className="bg-red-700 hover:bg-red-600"
                      >
                        <Trash className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}