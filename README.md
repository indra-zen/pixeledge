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

## 🏗️ Arsitektur & Detail Teknis

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

## 🧩 Code Snippets

Bagi kamu yang penasaran bagaimana beberapa fitur utama bekerja di balik layar, berikut adalah cuplikan kode penting di dalam aplikasi ini:

### 1. Eksekusi Multithreading (Web Worker)
Untuk memastikan antarmuka (UI) tidak membeku saat memproses jutaan piksel pada gambar resolusi tinggi, pengiriman data piksel ke Web Worker di latar belakang dilakukan secara *asynchronous* seperti ini:

```typescript
// Mengirim data piksel (ImageData) ke Web Worker
const processed = await new Promise<ImageData>((resolve, reject) => {
  const handler = (e: MessageEvent) => {
    if (e.data.id === id) {
      workerRef.current?.removeEventListener('message', handler);
      if (e.data.success) {
        resolve(e.data.processed); // Gambar berhasil diproses!
      } else {
        reject(new Error(e.data.error));
      }
    }
  };
  
  workerRef.current?.addEventListener('message', handler);
  
  // Melempar 'buffer' secara efisien tanpa menduplikasi beban memori
  workerRef.current?.postMessage(
    { id, imageData: inputImageData, type: 'denoise' },
    [inputImageData.data.buffer]
  );
});
```

### 2. Generator Dinamis CSS Filter
Untuk pratinjau (*preview*) editan yang mulus dan *real-time*, setiap geseran nilai *slider* ("Atur") akan langsung dikonversi menjadi nilai CSS Filter. Hal ini membuat browser memproses warnanya menggunakan akselerasi GPU (Kartu Grafis):

```typescript
// Fungsi untuk menerjemahkan parameter slider menjadi susunan CSS Filter
export const getFilterCSS = (s: FilterSettings) => {
  return `brightness(${(1 + s.brightness) * 100}%) 
          contrast(${s.contrast * 100}%) 
          saturate(${s.saturation * 100}%) 
          hue-rotate(${s.hue * 360}deg)
          ${s.blur ? ` blur(${s.blur * 2}px)` : ''}`;
};
```

### 3. Integrasi Kamera Web Native
Pengambilan gambar tidak memerlukan aplikasi pihak ketiga. Melalui API bawaan browser `navigator.mediaDevices`, aplikasi secara langsung meminta akses video dari gawai:

```typescript
// Mengakses kamera perangkat (Bisa berpindah kamera depan/belakang)
const newStream = await navigator.mediaDevices.getUserMedia({
  video: { 
    facingMode, // "user" (Depan) atau "environment" (Belakang)
    width: { ideal: 1920 }, 
    height: { ideal: 1080 } 
  }
});

// Memasukkan hasil tangkapan kamera ke dalam tag <video> HTML
setStream(newStream);
if (videoRef.current) {
  videoRef.current.srcObject = newStream;
}
```

### 4. Penyimpanan Lokal Mandiri (Offline Storage)
Untuk mengamankan draf foto, PixelEdge menggunakan antarmuka modern browser tingkat lanjut yaitu IndexedDB:

```typescript
// Menyimpan format "Blob" gambar langsung ke storage browser
async saveDraft(imageBlob: Blob): Promise<number> {
  await this.init(); // Memastikan database terbuka
  return new Promise((resolve, reject) => {
    // Membuka jalan transmisi (transaction) baca/tulis ke tabel 'drafts'
    const transaction = this.db!.transaction(['drafts'], 'readwrite');
    const store = transaction.objectStore('drafts');
    
    // Menyimpan data biner (Blob) disertai jejak waktu 
    const draft = { imageBlob, timestamp: Date.now() };
    const request = store.add(draft);
    
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}
```

### 5. Algoritma Edge-Preserving Smoothing (OpenCV Bilateral Filter)
Dalam Pengolahan Citra Digital, mengurangi *noise* (bintik) tanpa mengaburkan tepi/batas objek (*edge*) adalah tantangan utama. PixelEdge menggunakan `cv.bilateralFilter` dari WebAssembly OpenCV untuk melakukan ini:

```typescript
// cv.worker.ts & opencv.ts
// Mengonversi format web RGBA menjadi format RGB untuk OpenCV
const rgbMat = new cv.Mat();
cv.cvtColor(mat, rgbMat, cv.COLOR_RGBA2RGB);

// Melakukan Bilateral Filter (Parameter: d=9, sigmaColor=75, sigmaSpace=75)
// Semakin besar sigmaColor, warna yang berdekatan akan semakin membaur
cv.bilateralFilter(rgbMat, result, 9, 75, 75, cv.BORDER_DEFAULT);

// Mengembalikan ke format RGBA agar bisa digambar kembali ke HTML Canvas
const rgbaMat = new cv.Mat();
cv.cvtColor(result, rgbaMat, cv.COLOR_RGB2RGBA);
```

### 6. Analisis Distribusi Warna & Perhitungan Kontras (Histogram)
Penghitungan tingkat persebaran piksel gelap ke terang tidak memanggil fungsi *library* bawaan, melainkan dihitung murni menggunakan algoritma konversi *Grayscale/Luminance* (`0.299*R + 0.587*G + 0.114*B`) dan rumus variansi (*Variance*) / Standar Deviasi untuk mengukur rasio kontras citra:

```typescript
// imageUtils.ts
// Lakukan sampling pada piksel dengan melakukan iterasi matriks gambar 1D (tiap 4 indeks mewakili R, G, B, A)
for (let i = 0; i < data.length; i += step) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  
  // Perhitungan Luminance (Kecerahan Relatif Mata Manusia)
  const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  
  // Memasukkan piksel ke dalam "Bin" array histogram (mengelompokkan nilai 0-255 ke beberapa kelompok)
  const lBin = Math.min(bins - 1, Math.floor(l / binSize));
  lResult[lBin]++;
}

// Menghitung Kontras menggunakan Standar Deviasi (Akar dari Variansi)
let variance = 0;
for (let i = 0; i < sampledCount; i++) {
  const diff = lValues[i] - meanLuminance;
  variance += diff * diff; // Selisih kuadrat
}
variance /= sampledCount;
const contrast = Math.sqrt(variance); // Nilai akhir rasio kontras
```

---

## 💻 Panduan Menjalankan Secara Lokal

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





