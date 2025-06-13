-- Create storage bucket for native helper applications
INSERT INTO storage.buckets (id, name, public) VALUES ('native-helpers', 'native-helpers', true);

-- Create storage policies for public access to native helper files
CREATE POLICY "Public access to native helpers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'native-helpers');

CREATE POLICY "Admin can upload native helpers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'native-helpers' AND auth.role() = 'service_role');