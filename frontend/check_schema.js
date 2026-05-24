import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://xmooywgvrnfbtwkecwfo.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'dummy';

// We need the service key to get table info reliably or just make a rest call
console.log("Checking saved_words schema...");
