
/**
 * Handles communication with Supabase backend
 */
export class SupabaseApi {
  static async sendTranscriptionToSupabase(transcriptionData) {
    const supabaseUrl = 'https://jafylkqbmvdptrqwwyed.supabase.co/functions/v1/process-transcription';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphZnlsa3FibXZkcHRycXd3eWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3MjU1MzQsImV4cCI6MjA2NDMwMTUzNH0.dNNXK4VWW9vBOcTt9Slvm2FX7BuBUJ1uR5vdSULwgeY';
    
    const response = await fetch(supabaseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey
      },
      body: JSON.stringify({
        sessionId: transcriptionData.sessionId,
        text: transcriptionData.text,
        timestamp: transcriptionData.timestamp,
        source: 'chrome-extension-auto'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase error: ${response.status} - ${errorText}`);
    }
    
    return await response.json();
  }
}
