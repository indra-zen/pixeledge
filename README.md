# PixelEdge

PixelEdge is a Neo-brutalist offline-first image processing PWA using WebGL and OpenCV WebAssembly.

## Features
- Real-time WebGPU image processing
- Live intensity histogram via OpenCV.js WebAssembly
- Customizable filter pipeline
- IndexedDB preset and draft saving

## Advanced C++ OpenCV Pipeline
If you would like to test or build the C++ version of the OpenCV enhancement pipeline for even higher quality, check the `cpp/` directory. It contains an advanced pipeline utilizing Non-Local Means Denoising and CLAHE (Contrast Limited Adaptive Histogram Equalization). 

To build it to WebAssembly yourself using Emscripten:
```bash
cd cpp
./build.sh
```
