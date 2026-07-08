# 🎨 PixelEdge - Dokumentasi Presentasi

Selamat datang di panduan presentasi **PixelEdge**! Dokumen ini dirancang untuk membantumu menjelaskan proyek aplikasi editor foto ini dengan mudah, terstruktur, dan menarik di depan kelas.

---

## 🌟 1. Apa itu PixelEdge?

**PixelEdge** adalah aplikasi web pengeditan foto *real-time* yang cepat, ringan, dan langsung bisa digunakan di browser tanpa perlu menginstal aplikasi tambahan. 

Aplikasi ini mengusung desain **Neo-Brutalism** (desain dengan border tebal, warna-warni kontras, dan bayangan tegas) yang membuatnya terlihat modern, unik, dan sangat *eye-catching*.

---

## ✨ 2. Fitur Unggulan

Saat presentasi, kamu bisa mendemonstrasikan fitur-fitur berikut:

1. **📷 Tangkap & Unggah Langsung**
   - Bisa langsung mengambil foto dari kamera perangkat.
   - Bisa mengunggah foto dari galeri/folder penyimpanan.

2. **🪄 Filter Sekali Klik (Presets)**
   - Tersedia puluhan filter bawaan (Normal, Vintage, Cyberpunk, Cinematic, Neon, dll) yang langsung mengubah *mood* foto secara instan.
   - Pengguna juga bisa menyimpan racikan filter mereka sendiri (*Custom Filters*).

3. **🎛️ Pengaturan Manual (Adjustments)**
   - **Warna & Cahaya:** Kecerahan (Brightness), Kontras, Saturasi, Suhu (Temperature), Warna (Hue).
   - **Detail & Efek:** Ketajaman (Sharpness), Blur, Vignette (efek gelap di ujung foto), dan Grain (efek bintik analog).

4. **📊 Grafik Histogram Real-time**
   - Menampilkan grafik warna (Merah, Hijau, Biru) dan kecerahan secara langsung. Sangat berguna bagi yang paham fotografi untuk melihat keseimbangan warna foto.

5. **💾 Simpan & Ekspor Fleksibel**
   - **Draf Offline:** Simpan proyek yang belum selesai ke dalam browser (menggunakan IndexedDB) tanpa butuh internet.
   - **Ekspor Format Lengkap:** Simpan foto yang sudah diedit ke format **PNG**, **JPG**, atau **WEBP**.
   - **Bagikan:** Langsung bagikan hasil editan ke aplikasi lain.

6. **📱 Responsif & Ramah Sentuhan**
   - Bisa diakses lewat HP (Touchscreen) untuk *pinch-to-zoom* maupun lewat Laptop/PC dengan layout khusus yang nyaman.

---

## 🛠️ 3. Teknologi di Balik Layar

Untuk menjawab pertanyaan dari dosen atau teman, ini adalah teknologi yang digunakan:

- **Frontend Framework:** React.js dengan TypeScript (untuk kodingan yang lebih terstruktur dan minim *bug*).
- **Styling:** Tailwind CSS (untuk mendesain tampilan Neo-Brutalism yang keren dengan cepat).
- **Image Processing (Pemrosesan Gambar):**
  - Menggunakan **HTML Canvas** dan **Web Workers** untuk memproses foto berat (seperti menghapus *noise*) di latar belakang agar aplikasi tidak *lag* (tetap 60 FPS).
- **Penyimpanan Lokal:** IndexedDB (melalui *wrapper* ringan) untuk menyimpan riwayat draf secara *offline* di browser pengguna.
- **Ikon:** Lucide React.

---

## 🚀 4. Alur Presentasi yang Disarankan

1. **Pembukaan:** Buka aplikasi, tunjukkan desain Neo-Brutalism-nya. Jelaskan secara singkat apa itu PixelEdge.
2. **Demo Impor Gambar:** Ambil foto lewat kamera web atau unggah gambar dari komputer.
3. **Demo Filter:** Klik beberapa filter *Preset* (seperti Cyberpunk atau Cinematic) untuk menunjukkan betapa cepat perubahannya.
4. **Demo Manual:** Buka panel 'Atur', lalu geser *slider* Brightness, Contrast, dan tambahkan efek Vignette.
5. **Demo Undo/Redo:** Tunjukkan kalau kita bisa membatalkan editan dengan mudah.
6. **Demo Ekspor:** Klik tombol "Ekspor" dan unduh hasil gambar dalam format WEBP atau JPG.
7. **Penutup:** Jelaskan kalau aplikasi ini berjalan sepenuhnya di browser tanpa butuh server/internet (setelah dimuat), sehingga sangat cepat dan aman (privasi terjaga karena foto tidak dikirim ke server orang lain).

---

## 💡 Tips Tambahan

- **Siapkan Foto yang Bagus:** Sebelum presentasi, siapkan 2-3 foto dengan pencahayaan yang berbeda (terang, agak gelap, dan foto pemandangan) untuk menunjukkan kehebatan filter PixelEdge.
- **Tekan Tombol Bantuan (?):** Jika ingin menunjukkan cara kerja aplikasi secara otomatis, kamu bisa mengklik ikon tanda tanya (?) di pojok kanan bawah untuk menjalankan *Interactive Tour*.

Semoga presentasinya berjalan lancar dan sukses! 🚀
