
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Convert Float32Array audio data to base64 WebM format
function convertAudioToBase64(audioData: number[]): string {
  console.log('Converting audio data to base64, length:', audioData.length);
  
  // Create a simple WAV header for the audio data
  const sampleRate = 48000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataLength = audioData.length * 2; // 16-bit samples
  const fileLength = 44 + dataLength;
  
  const buffer = new ArrayBuffer(fileLength);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, fileLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
  view.setUint16(32, numChannels * bitsPerSample / 8, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Convert float32 samples to int16
  let offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  // Convert to base64
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio, audioData } = await req.json();
    
    console.log('Received audio request:', { 
      hasAudio: !!audio, 
      hasAudioData: !!audioData,
      audioDataLength: audioData?.length 
    });
    
    let audioBase64: string;
    
    if (audioData && Array.isArray(audioData)) {
      // Handle raw audio data from extension
      console.log('Processing raw audio data from extension');
      audioBase64 = convertAudioToBase64(audioData);
    } else if (audio) {
      // Handle pre-encoded base64 audio
      console.log('Using provided base64 audio');
      audioBase64 = audio;
    } else {
      throw new Error('No audio data provided');
    }

    console.log('Sending audio to OpenAI Whisper, base64 length:', audioBase64.length);

    // Prepare form data
    const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const formData = new FormData();
    const blob = new Blob([audioBuffer], { type: 'audio/wav' });
    formData.append('file', blob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const result = await response.json();
    console.log('Speech-to-text result:', result.text);

    return new Response(
      JSON.stringify({ text: result.text || '', success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Speech-to-text error:', error);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
