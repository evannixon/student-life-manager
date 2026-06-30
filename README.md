# 🎓 Student Life Manager

Aplikasi manajemen keuangan & tugas untuk mahasiswa — realtime, multi-device.

## Tech Stack
- **Next.js 14** — Frontend framework
- **Supabase** — Database + Auth + Realtime
- **TypeScript** — Type safety
- **Gemini Vision API** — OCR scan nota (Phase 2)

---

## 🚀 Cara Setup (Ikuti Urutan Ini)

### Step 1 — Buat Project Supabase
1. Buka https://supabase.com → Sign up / Login
2. Klik **New Project**
3. Isi nama project: `student-life-manager`
4. Set password database (simpan baik-baik!)
5. Pilih region: **Southeast Asia (Singapore)**
6. Klik **Create new project** → tunggu ~2 menit

### Step 2 — Setup Database
1. Di Supabase dashboard → klik **SQL Editor** (sidebar kiri)
2. Klik **New Query**
3. Copy semua isi file `SUPABASE_SETUP.sql`
4. Paste di SQL Editor → klik **Run**
5. Pastikan muncul: *"Setup selesai! Tabel transactions dan tasks siap dipakai."*

### Step 3 — Ambil API Keys
1. Di Supabase → **Settings** (ikon gear) → **API**
2. Copy:
   - **Project URL** → paste ke `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → paste ke `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 4 — Setup Project di Komputer
```bash
# Clone / download folder ini ke komputer kamu
# Masuk ke folder
cd student-life-manager

# Install dependencies
npm install

# Buat file .env.local (copy dari .env.example)
cp .env.example .env.local

# Edit .env.local — isi dengan API keys dari Step 3
# NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...

# Jalankan development server
npm run dev
```

### Step 5 — Buka di Browser
```
http://localhost:3000
```

Daftar akun → langsung bisa dipakai!

---

## 📁 Struktur Project

```
src/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── globals.css         # Global styles
│   └── page.tsx            # Entry point (auth gate)
├── components/
│   ├── AuthForm.tsx        # Login / Register
│   └── Dashboard.tsx       # Main app (3 tab)
└── lib/
    ├── supabase.ts         # Supabase client + types
    └── hooks/
        ├── useTransactions.ts  # CRUD + Realtime transactions
        └── useTasks.ts         # CRUD + Realtime tasks
```

---

## ✅ Fitur Phase 1
- [x] Auth (Register, Login, Logout)
- [x] Dashboard — budget overview, stats, critical tasks
- [x] Keuangan — tambah transaksi, breakdown per kategori
- [x] Tugas — tambah tugas, Danger Score, update status
- [x] Realtime sync (multi-device)
- [x] Survival Mode (budget < 20%)

## 🔜 Phase 2 (berikutnya)
- [ ] OCR Foto Nota dengan Gemini Vision API
- [ ] Financial Roasting by AI
- [ ] Split Bill
