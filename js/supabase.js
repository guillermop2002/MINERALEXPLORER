import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm';

// Supabase Configuration
const supabaseUrl = 'https://myatkvpuybtxwykhjyxb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YXRrdnB1eWJ0eHd5a2hqeXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NTc1MTMsImV4cCI6MjA4ODMzMzUxM30.8-2HYrUI5WDyDth1BLHYyRVjWdTtnY0RoybOCi4ffBk';

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseKey);
