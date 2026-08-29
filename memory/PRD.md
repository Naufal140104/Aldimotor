# ALDI MOTOR - Sistem Reservasi Servis Motor

## Problem Statement
Website reservasi/booking servis motor untuk bengkel ALDI MOTOR. Customer bisa memilih tanggal, jam, jenis servis. Sistem mengalokasikan mekanik otomatis dari 5 mekanik aktif. Ada dashboard admin untuk mengelola reservasi.

## Architecture
- Backend: FastAPI + MongoDB (motor async), JWT auth, timezone Asia/Makassar
- Frontend: React 19 + Vite/CRA + Tailwind + Shadcn UI + react-day-picker + sonner
- Auth: JWT Bearer token (localStorage) — admin only
- Notifikasi: wa.me link fallback (bukan API)

## Personas
- **Customer**: pemilik motor yang butuh booking sebelum ke bengkel
- **Admin**: pemilik/staf bengkel yang mengelola reservasi

## Core Requirements
1. Reservasi window H+1 s/d H+7, tutup Minggu + hari libur khusus
2. Jam operasional Senin–Sabtu 08:00–16:00 (bisa diubah admin)
3. Servis: Ringan 1j, Berat 2j, Overhaul 4j, Request 1j (custom)
4. 5 mekanik (bisa CRUD), otomatis alokasi
5. Slot: max 5 customer/jam (= 5 mekanik). Sistem mencegah double booking
6. Nomor reservasi format RSV-YYYYMMDD-NNNN

## Implemented (v1 - 2026-08-29)
- Backend endpoints (18/18 passed):
  - Auth: login/logout/me
  - Public: /services, /mechanics, /business-hours (dengan today/min/max), /holidays, /availability, /bookings
  - Admin: /admin/bookings (list + PATCH status/mechanic/duration), /admin/stats, /admin/mechanics CRUD, /admin/services PATCH, /admin/business-hours PUT, /admin/holidays POST/DELETE
- Frontend:
  - Landing: Hero + 4 service cards + Cara Reservasi + Kontak (blue+white premium theme, Outfit/Manrope fonts)
  - Reservasi 4-step flow dengan progress stepper, calendar timezone-aware, slot capacity badges
  - Admin login (JWT)
  - Admin Dashboard: overview stats, bookings list dengan action buttons (Konfirmasi, Mulai Servis, Selesaikan, Batalkan), mekanik CRUD, pengaturan jam operasional/durasi/hari libur

## Backlog (P1/P2)
- P1: Kalender view mingguan/bulanan untuk admin
- P1: Notifikasi Twilio WhatsApp API (kirim otomatis, bukan wa.me link)
- P2: Reminder H-1 otomatis
- P2: Riwayat servis per nomor polisi (customer history)
- P2: Export laporan reservasi bulanan ke CSV/PDF
- P2: Multi-cabang (multi-tenant)

## Credentials
Admin: admin@aldimotor.com / admin123
