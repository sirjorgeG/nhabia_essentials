// js/supabase.js

const supabaseUrl =
'https://hsnepvvflizzxniiolxc.supabase.co';

const supabaseKey =
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzbmVwdnZmbGl6enhuaWlvbHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzE3MTYsImV4cCI6MjA5NTkwNzcxNn0.i4bLMRh5FSAX2nX0mEeqi_-_n-G7d1xpmXklm7IiJE8';

const supabaseClient =
supabase.createClient(
  supabaseUrl,
  supabaseKey
);