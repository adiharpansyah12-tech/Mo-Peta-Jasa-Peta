const SUPABASE_URL = "https://pqsjbshjngdpsgxvlklv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxc2pic2hqbmdkcHNneHZsa2x2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNjM4ODgsImV4cCI6MjA5MTYzOTg4OH0.1Jn6gTiEstM1UJIyU8ue-QsOvcpbx-xeGB1FMDB6pvM";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
//  Mo-PETA — Konfigurasi Google Sheets
//  Ganti nilai di bawah dengan URL Web App Anda dari Apps Script
// ============================================================

// const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxUpSEVum-JXc2jYJourq80NnDpPR1IM5c-seZw4xSmNeLzeAVeNFSjpKqL98f-I49e1A/exec";
