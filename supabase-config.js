/* ============================================================================
   SUPABASE CLIENT CONFIGURATION
   File: supabase-config.js
   ============================================================================ */

// 1. Sahi Clean URL (Bina kisi /rest/v1/ ke) aur Publishable Key
const SUPABASE_URL = 'https://rdydrxktcfzpyytivilv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_WBi-7b2NZZhVAQqXxAqsoA_0QwLwNB0';

// 2. Client Initialize
if (window.supabase) {
  window.sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
} else {
  console.error('Supabase library load nahi hui.');
}
