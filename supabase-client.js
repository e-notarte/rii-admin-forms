import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// IMPORTANT: Replace these with your actual Supabase Project URL and Anon Key
const supabaseUrl = 'https://toumsirfqtvdzdrnhncw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvdW1zaXJmcXR2ZHpkcm5obmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2NDQyMjksImV4cCI6MjEwNTIyMDIyOX0.7lcrL4AOVR4MeWJjybb-5wmzGoey3qHHfvc1_or9pG4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
