# 🎨 PixelEdge - Editor Foto Web

PixelEdge adalah Progressive Web App (PWA) pengedit foto yang interaktif, mengusung desain *Neo-Brutalism*, dan bisa berjalan sepenuhnya secara *offline*. Dibangun menggunakan React dan TypeScript, aplikasi ini memanfaatkan Web Workers, HTML5 Canvas, dan OpenCV WebAssembly untuk menghadirkan manipulasi gambar *real-time* yang super cepat langsung di dalam browser.

## ✨ Fitur Unggulan

- 📸 **Kamera & Unggah Langsung**: Ambil foto langsung dari *webcam* atau unggah gambar dari penyimpanan perangkatmu.
- 🪄 **Filter Instan (Presets)**: Tersedia lebih dari 19 pilihan filter estetik bawaan (seperti Cyberpunk, Cinematic, Lomo, Vintage, dll) yang bisa diterapkan dalam sekali klik.
- 🎛️ **Pengaturan Lengkap**: Atur sendiri Kecerahan, Kontras, Saturasi, Warna (Hue), Suhu, Ketajaman, Blur, Vignette, hingga efek Grain.
- 📊 **Grafik Histogram Real-time**: Pantau intensitas warna RGB dan pencahayaan secara langsung berkat kecanggihan OpenCV.js.
- 💾 **Draf Offline**: Tak perlu khawatir kehilangan hasil editan. Draf dan filter buatanmu otomatis tersimpan secara lokal menggunakan IndexedDB.
- 📤 **Ekspor Fleksibel**: Simpan hasil akhir karyamu dalam format PNG, JPG, atau WEBP.
- 📱 **UI Neo-Brutalism yang Responsif**: Antarmuka dengan kontras tinggi yang berani, dirancang agar nyaman digunakan di komputer (desktop) maupun layar sentuh (HP).

## 🛠️ Teknologi yang Digunakan

- **Frontend**: React 18, TypeScript, Vite
- **Desain/Styling**: Tailwind CSS
- **Pemrosesan Gambar**: HTML5 Canvas API, Web Workers, OpenCV WebAssembly
- **Penyimpanan Lokal**: IndexedDB (untuk menyimpan data *offline* secara utuh)
- **Ikon**: Lucide React

## 🔒 Privasi & Arsitektur

PixelEdge berjalan **100% di sisi klien (browser pengguna)**. 
- Foto atau gambarmu **tidak pernah** diunggah ke *server* luar mana pun. Privasi sangat terjamin.
- Komputasi berat (seperti pemrosesan histogram dan efek visual) ditangani oleh **Web Workers**, sehingga antarmuka utama aplikasi tidak akan *lag* dan tetap berjalan mulus.
- Sebagai PWA, aplikasi ini bisa langsung diinstal ke perangkat (seperti layaknya aplikasi biasa) dan dapat dioperasikan tanpa koneksi internet sama sekali.

## 💻 Cara Menjalankan Secara Lokal

Jika kamu ingin mencoba atau mengembangkan proyek ini di komputermu sendiri:

```bash
# Instal dependensi (modul yang dibutuhkan)
npm install

# Jalankan server untuk tahap pengembangan
npm run dev

# Compile aplikasi untuk lingkungan produksi
npm run build
```
