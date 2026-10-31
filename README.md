# 🌤️ MeteoPulse — Aplikasi Prediksi Cuaca & Filter Digital DSP

> **Proyek Mata Kuliah: Pengolahan Sinyal Digital (PSD) — Semester 7**  
> Dashboard Cuaca Interaktif dengan Implementasi Algoritma **Simple Moving Average (SMA)** sebagai Filter FIR Low-Pass untuk Penghalusan Sinyal Temperatur.

---

## 🚀 Cara Menjalankan Aplikasi

Aplikasi sekarang sudah terintegrasi penuh. Backend Express secara otomatis menyajikan frontend dan API sekaligus.

### 1. Jalankan Server
Buka terminal di root folder project ini, lalu jalankan:
```bash
npm start
```

### 2. Buka di Browser
Buka tautan berikut di browser:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🌟 Fitur Utama & Peningkatan (Refactor v2.0)

### 1. 📊 Dashboard Meteorologi Modern (Aesthetic Glassmorphism)
- **Cuaca Terkini**: Menampilkan suhu aktual, *feels like*, kelembapan, kecepatan angin, tekanan atmosfer, jarak pandang, dan waktu pembaruan otomatis.
- **Prakiraan 24 Jam**: Kartu geser per jam dengan indikator peluang hujan dan nilai filter SMA.
- **Prakiraan 5 Hari**: Tampilan harian dengan visual bar rentang suhu (*temperature range gradient*).
- **Dark Mode & Light Mode**: Desain responsif dengan palet OLED deep-slate di mode gelap dan clean-slate di mode terang.

### 2. 🔬 Laboratorium Pemrosesan Sinyal Digital (PSD / DSP)
- **Algoritma Simple Moving Average (SMA)**:
  $$y[n] = \frac{1}{M} \sum_{k=0}^{M-1} x[n-k]$$
- **Pilihan Window Size Dinamis**: Pilihan window $M = 3, 4, 5, 6$ untuk menguji efek penghalusan sinyal (*noise reduction*).
- **Perbandingan Sinyal**: Menampilkan Sinyal Asli $x[n]$, Sinyal Filter SMA $y[n]$, serta opsi Exponential Moving Average (EMA).
- **Metrik Reduksi Noise**: Menghitung persentase penurunan variasi mikro-fluktuasi suhu secara real-time.

### 3. 🗺️ Peta Radar Interaktif (OpenLayers)
- Tampilan peta dunia dan Indonesia berbasis OpenStreetMap.
- **Fitur Klik Peta**: Klik titik mana saja di peta untuk langsung mendapatkan cuaca dan analisis sinyal lokasi tersebut!
- Marker radar animasi berkedip (*radar pulse*) dan popup koordinat interaktif.

### 4. 📈 Komparasi Multi-Kota
- Membandingkan hingga 5 kota secara bersamaan (misal: Bandung, Jakarta, Surabaya, Bali, Medan).
- Pilihan metrik: Suhu Maksimum, Suhu Minimum, Suhu Rata-rata, Curah Hujan, dan Kecepatan Angin.
- Tersedia terintegrasi di tab navigasi maupun sebagai halaman mandiri di `/compare`.

### 5. 🔍 Pencarian & Geolokasi Cerdas
- **Autocomplete Pencarian Kota**: Menampilkan saran kota otomatis saat mengetik.
- **Deteksi GPS (Lokasi Saya)**: Tombol GPS satu klik menggunakan Geolocation API peramban.
- **Quick Badges**: Tombol pintas untuk kota-kota besar di Indonesia dan dunia.

### 6. 📋 Data Mentah & Export CSV
- Tabel data numerik sinyal per jam (*hourly*) dan harian (*daily*).
- Tombol satu klik **Export ke CSV** dengan penamaan file otomatis berdasarkan nama kota dan tanggal.

---

## 📁 Struktur Proyek

```text
Aplikasi Prediksi Cuaca/
├── backend/
│   ├── server.js            # Express 5 server (API cuaca, DSP, komparasi, static server)
│   ├── package.json         # Dependensi backend (axios, express, cors)
│   └── node_modules/
├── frontend/
│   ├── index.html           # Halaman utama aplikasi (SPA 4-tab)
│   ├── compare.html         # Halaman komparasi mandiri
│   ├── tailwind.config.js   # Konfigurasi tema Tailwind CSS
│   ├── css/
│   │   ├── input.css        # Sumber CSS Tailwind + custom utility
│   │   └── style.css        # Hasil kompilasi Tailwind CSS
│   └── js/
│       ├── api.js           # Client API module
│       ├── main.js          # Controller & event listener utama
│       ├── map.js           # Integrasi peta OpenLayers
│       └── ui.js            # Fungsi render DOM, chart & tabel
├── .agents/                 # Folder referensi skill UI/UX & design intelligence
├── package.json             # Root runner script (npm start, npm run dev)
└── README.md                # Dokumentasi proyek
```

---

## 🛠️ Perintah Lainnya

- **Membangun Ulang CSS (Tailwind)** jika ada modifikasi class HTML:
  ```bash
  npm run build:css
  ```
- **Mode Development Backend**:
  ```bash
  npm run dev
  ```

