# SmashArena Backend API

Backend Express.js + PostgreSQL untuk aplikasi pemesanan lapangan badminton SmashArena.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Auth**: JWT (JSON Web Token)
- **Upload**: Multer (bukti pembayaran)
- **Password**: bcryptjs

---

## Struktur Proyek

```
smash-arena-backend/
├── src/
│   ├── config/
│   │   └── db.js               # Koneksi PostgreSQL
│   ├── controllers/
│   │   ├── authController.js   # Register, Login, Me, Update Profile
│   │   ├── bookingController.js # CRUD Booking + konfirmasi/tolak
│   │   ├── courtController.js  # CRUD Lapangan
│   │   ├── scheduleController.js # Jadwal ketersediaan
│   │   ├── notificationController.js # Notifikasi user & admin
│   │   └── dashboardController.js # Stats admin dashboard
│   ├── middleware/
│   │   ├── auth.js             # JWT authenticate + requireAdmin
│   │   └── upload.js           # Multer upload bukti bayar
│   ├── models/
│   │   ├── migrate.js          # Buat semua tabel
│   │   └── seed.js             # Data awal (courts, admin, demo user)
│   ├── routes/
│   │   ├── auth.js
│   │   ├── bookings.js
│   │   ├── courts.js
│   │   ├── schedule.js
│   │   ├── notifications.js
│   │   └── dashboard.js
│   └── server.js               # Entry point
├── uploads/
│   └── payments/               # Bukti transfer tersimpan di sini
├── .env                        # Konfigurasi environment
├── .env.example
└── package.json
```

---

## Cara Setup

### 1. Prasyarat
- Node.js v18+
- PostgreSQL 14+

### 2. Buat Database PostgreSQL
```sql
CREATE DATABASE smash_arena;
```

### 3. Konfigurasi Environment
Edit file `.env` sesuai konfigurasi database Anda:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smash_arena
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=ganti_dengan_secret_yang_aman
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development
UPLOAD_PATH=./uploads/payments
MAX_FILE_SIZE=5242880
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Jalankan Migrasi (Buat Tabel)
```bash
npm run db:migrate
```

### 6. Jalankan Seeder (Data Awal)
```bash
npm run db:seed
```

Output seeder:
```
✅ Seeded: courts (6 courts)
✅ Seeded: admin user (admin@smasharena.com / admin123)
✅ Seeded: demo user (ahmad@gmail.com / password)
```

### 7. Jalankan Server
```bash
# Development (dengan nodemon)
npm run dev

# Production
npm start
```

Server berjalan di: `http://localhost:3000`

---

## API Endpoints

### Auth
| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| POST | `/api/auth/register` | Public | Daftar akun baru |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Login | Data user aktif |
| PUT | `/api/auth/profile` | Login | Update profil |

### Courts (Lapangan)
| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/courts` | Public | Semua lapangan |
| GET | `/api/courts/:id` | Public | Detail lapangan |
| POST | `/api/courts` | Admin | Tambah lapangan |
| PATCH | `/api/courts/:id` | Admin | Update lapangan |

### Schedule (Jadwal)
| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/schedule?date=YYYY-MM-DD` | Public | Ketersediaan semua lapangan |

### Bookings
| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| POST | `/api/bookings` | Login | Buat booking (multipart/form-data) |
| GET | `/api/bookings/my` | Login | Riwayat booking saya |
| GET | `/api/bookings/:id` | Login | Detail booking |
| PATCH | `/api/bookings/:id/cancel` | Login | Batalkan booking |
| GET | `/api/bookings` | Admin | Semua booking |
| PATCH | `/api/bookings/:id/confirm` | Admin | Konfirmasi booking |
| PATCH | `/api/bookings/:id/reject` | Admin | Tolak booking |

### Notifications
| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/notifications` | Login | Notifikasi saya |
| PATCH | `/api/notifications/read-all` | Login | Tandai semua dibaca |
| PATCH | `/api/notifications/:id/read` | Login | Tandai 1 dibaca |

### Dashboard (Admin)
| Method | Endpoint | Akses | Deskripsi |
|--------|----------|-------|-----------|
| GET | `/api/dashboard/stats` | Admin | Statistik + chart data |

---

## Contoh Request

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smasharena.com","password":"admin123"}'
```

### Buat Booking (dengan bukti transfer)
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Authorization: Bearer <token>" \
  -F "fullName=Ahmad Rizky" \
  -F "phone=081234567890" \
  -F "date=2024-12-25" \
  -F "courtId=1" \
  -F "startTime=08:00" \
  -F "duration=2" \
  -F "totalPrice=100000" \
  -F "paymentProof=@/path/to/bukti.jpg"
```

### Cek Jadwal
```bash
curl http://localhost:3000/api/schedule?date=2024-12-25
```

---

## Alur Booking

```
User buat booking + upload bukti bayar
          ↓
     Status: waiting_payment
          ↓
   Admin lihat di halaman Pembayaran
          ↓
   Admin konfirmasi / tolak
          ↓
  Status: confirmed / rejected
          ↓
   Notifikasi dikirim ke user
```

---

## Status Booking
| Status | Keterangan |
|--------|-----------|
| `waiting_payment` | Menunggu verifikasi pembayaran admin |
| `pending` | Diproses admin |
| `confirmed` | Dikonfirmasi, lapangan terjadwal |
| `rejected` | Ditolak admin |
| `cancelled` | Dibatalkan user |

---

## Kredensial Default
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@smasharena.com | admin123 |
| User Demo | ahmad@gmail.com | password |

---

## Deploy ke Railway

### 1. Push ke GitHub
```bash
git init
git add .
git commit -m "Initial backend commit"
git remote add origin https://github.com/USERNAME/smash-arena-backend.git
git branch -M main
git push -u origin main
```

### 2. Buat Project di Railway
1. Buka [railway.app](https://railway.app) → login dengan GitHub.
2. **New Project** → **Provision PostgreSQL** (Railway otomatis membuat `DATABASE_URL`).
3. Di project yang sama: **New** → **GitHub Repo** → pilih repo backend ini.

### 3. Set Environment Variables
Buka service backend → tab **Variables** → isi:
```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=ganti_dengan_string_acak_panjang
JWT_EXPIRES_IN=7d
NODE_ENV=production
UPLOAD_PATH=./uploads/payments
MAX_FILE_SIZE=5242880
FRONTEND_URL=https://nama-app-kamu.netlify.app
BASE_URL=https://nama-backend-kamu.up.railway.app
```
`PORT` tidak perlu diisi manual — Railway mengaturnya otomatis dan kode sudah membaca `process.env.PORT`.

### 4. Generate Domain
Tab **Settings** → **Networking** → **Generate Domain**. Salin URL yang muncul, lalu update `BASE_URL` di Variables dengan URL tersebut.

### 5. Jalankan Migration & Seed
File `Procfile` di project ini sudah memuat command `release` yang otomatis menjalankan migrate + seed setiap deploy berhasil (didukung platform yang membaca Procfile). Jika Railway tidak menjalankannya otomatis, jalankan manual via Railway CLI:
```bash
npm install -g @railway/cli
railway login
railway link
railway run npm run db:migrate
railway run npm run db:seed
```

### Catatan Upload File
Railway tidak menyediakan disk permanen di plan standar — file di `uploads/payments` akan hilang setiap kali service redeploy/restart. Untuk demo/tugas ini biasanya tidak masalah. Untuk produksi nyata, pertimbangkan pindah ke Cloudinary atau S3.

