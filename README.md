# 🎨 PixelEdge - Editor Foto Web

PixelEdge adalah Progressive Web App (PWA) pengedit foto yang interaktif, mengusung desain *Neo-Brutalism*, dan bisa berjalan sepenuhnya secara *offline*. Dibangun menggunakan React dan TypeScript, aplikasi ini memanfaatkan Web Workers, HTML5 Canvas, dan OpenCV WebAssembly untuk menghadirkan manipulasi gambar *real-time* yang super cepat langsung di dalam browser tanpa harus menginstal software berat.

---

## ✨ Fitur Unggulan

- 📸 **Kamera & Unggah Langsung**: Ambil foto langsung dari *webcam* atau unggah gambar dari penyimpanan perangkatmu secara instan.
- 🪄 **Filter Instan (Presets)**: Tersedia lebih dari 19 pilihan filter estetik (Cyberpunk, Cinematic, Lomo, dll) yang langsung memanipulasi *pixel* gambar.
- 🎛️ **Pengaturan Manual Terperinci**: Atur sendiri Kecerahan, Kontras, Saturasi, Warna (Hue), Suhu, Ketajaman, Blur, Vignette, hingga efek Grain.
- 📊 **Grafik Histogram Real-time**: Pantau persebaran dan intensitas warna RGB serta pencahayaan secara langsung (sangat berguna bagi yang paham fotografi).
- 💾 **Penyimpanan Lokal Otomatis**: Draf gambar yang sedang dikerjakan dan filter kustom tersimpan aman secara *offline* di browser.
- 📤 **Ekspor Resolusi Tinggi**: Unduh hasil editan dalam format gambar modern: PNG, JPG, atau WEBP.
- 📱 **Desain Responsif**: Antarmuka PWA *Neo-Brutalism* yang dirancang adaptif. Nyaman dioperasikan lewat komputer *desktop* dengan *mouse* maupun HP dengan navigasi layar sentuh (mendukung *pinch-to-zoom* interaktif).

---

## 🏗️ Arsitektur & Detail Teknis (Untuk Pembahasan Teknis)

Aplikasi ini menggunakan pendekatan arsitektur *100% Client-Side* (sepenuhnya berjalan di peramban/browser pengguna) tanpa adanya pemrosesan dari server eksternal (`Backend-less`). Berikut adalah beberapa teknologi inti yang dipakai:

1. **OpenCV WebAssembly & Pemrosesan Citra:** 
   Penghitungan histogram (merah, hijau, biru) dan beberapa modifikasi gambar tingkat lanjut diproses menggunakan *Library* Computer Vision nomor 1 di dunia (OpenCV) yang dikompilasi (di- *compile*) ke dalam format WebAssembly agar bisa berjalan di browser dengan kecepatan menyerupai bahasa C++.
2. **Web Workers (Multithreading):**
   Memodifikasi piksel gambar beresolusi tinggi memakan banyak memori dan CPU. Agar antarmuka (UI) tidak berhenti sesaat (*lag* / *freeze*), tugas berat pemrosesan gambar dilempar ke *background thread* melalui Web Workers.
3. **HTML5 Canvas API & WebGL:**
   Setiap geseran *slider* efek warna langsung diaplikasikan ke elemen `<canvas>`. Pemanfaatan teknologi WebGL untuk akselerasi perangkat keras (Hardware Acceleration) pada tingkat GPU memastikan manipulasi visual super responsif, bahkan mempertahankan render stabil hingga 60 FPS (Frame per Detik).
4. **Penyimpanan IndexedDB Native:**
   Menyimpan gambar berukuran besar langsung ke basis data lokal milik browser (menggunakan API native `indexedDB`), memungkinkan penyimpanan draf saat luring (*offline*).

---

## 💻 Panduan Menjalankan Secara Lokal (Untuk Pemula)

Jika kamu ingin menjalankan atau memodifikasi kode sumber (source code) aplikasi ini di komputermu sendiri, ikuti langkah-langkah detail berikut:

### 1. Persiapan Awal (Prasyarat)
Pastikan kamu sudah menginstal perangkat lunak berikut di komputermu:
- **Node.js** (Versi 18 ke atas) - [Unduh Node.js di sini](https://nodejs.org/)
- **Git** - [Unduh Git di sini](https://git-scm.com/)

*(Catatan: Untuk mengecek apakah Node.js sudah terinstal, buka Terminal / Command Prompt dan ketik `node -v` dan `npm -v`)*

### 2. Mengunduh Kode (Clone Repository)
Buka Terminal / Command Prompt, lalu jalankan perintah ini untuk mengunduh kode aplikasi ke komputermu:
```bash
git clone https://github.com/indra-zen/pixeledge.git
cd pixeledge
```

### 3. Menginstal Dependensi (Modul)
Unduh seluruh *library* yang dibutuhkan (seperti React, Vite, dan Tailwind CSS) dengan menjalankan:
```bash
npm install
```
*(Tunggu beberapa saat sampai proses unduhan selesai).*

### 4. Menjalankan Mode Pengembangan (Dev Server)
Untuk menyalakan server lokal dan langsung melihat hasil aplikasinya, jalankan:
```bash
npm run dev
```
Setelah itu, buka browser (Chrome/Edge/Safari) dan kunjungi alamat:  
👉 **http://localhost:3000**

Setiap kali kamu mengubah kode, halaman browser akan otomatis memuat ulang (*hot-reload*).

---

## 📦 Kompilasi & Pengujian Mode Produksi (Build)

Jika kamu sudah selesai memodifikasi kode dan ingin melihat versi final aplikasi yang sudah dioptimasi untuk rilis (termasuk fitur PWA *offline* Service Worker), jalankan langkah ini:

1. Buat versi produksi:
   ```bash
   npm run build
   ```
2. Jalankan server pratinjau (Preview Server):
   ```bash
   npm run preview
   ```
Aplikasi akan mensimulasikan lingkungan seolah-olah sudah diterbitkan (*deployed*) di internet secara nyata.

---

*Built on Google AI Studio - with Gemini Pro Latest*





