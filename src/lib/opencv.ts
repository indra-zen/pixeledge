export class OpenCVProcessor {
  private ready = false;
  private cv: any = null;
  private initPromise: Promise<void> | null = null;
  
  constructor() {
    // Start initialization in background
    this.init().catch(console.error);
  }

  async init() {
    if (this.ready) return;
    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = (async () => {
      // Wait for Service Worker to be active so it can intercept and cache the heavy OpenCV module
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.ready;
        } catch (e) {
          console.warn('Service Worker not ready, proceeding anyway', e);
        }
      }

      // Dynamically import the heavy module to avoid blocking the main thread during app load
      const cvModule = await import('@techstark/opencv-js');
      let resolvedCv = cvModule.default || cvModule;
      
      // Some bundlers/environments wrap the export
      if (typeof resolvedCv === 'function') {
        resolvedCv = await (resolvedCv as any)();
      } else if (resolvedCv instanceof Promise) {
        resolvedCv = await resolvedCv;
      }
      
      this.cv = resolvedCv;

      // If it's already fully loaded
      if (this.cv.getBuildInformation) {
        this.ready = true;
        return;
      }

      // Wait for onRuntimeInitialized
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error("OpenCV initialization timed out."));
        }, 15000); // 15 seconds timeout
        
        const originalOnRuntimeInitialized = this.cv.onRuntimeInitialized;
        this.cv.onRuntimeInitialized = () => {
          if (originalOnRuntimeInitialized) {
            originalOnRuntimeInitialized();
          }
          clearTimeout(timeout);
          resolve();
        };
        
        // Fallback polling just in case onRuntimeInitialized was already fired
        // or gets swallowed by some bundler magic.
        const interval = setInterval(() => {
          if (this.cv && this.cv.getBuildInformation) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve();
          }
        }, 100);
      });

      this.ready = true;
    })();

    await this.initPromise;
  }

  async processImage(imageData: ImageData, type: 'denoise' | 'edge' = 'denoise'): Promise<ImageData> {
    if (!this.ready) {
      await this.init();
    }
    
    const cv = this.cv;
    // Create Mat from ImageData
    const mat = cv.matFromImageData(imageData);
    const result = new cv.Mat();
    
    if (type === 'denoise') {
        // Bilateral Filter for denoising
        // convert RGBA to RGB
        const rgbMat = new cv.Mat();
        cv.cvtColor(mat, rgbMat, cv.COLOR_RGBA2RGB);
        
        cv.bilateralFilter(rgbMat, result, 9, 75, 75, cv.BORDER_DEFAULT);
        
        // convert back to RGBA
        const rgbaMat = new cv.Mat();
        cv.cvtColor(result, rgbaMat, cv.COLOR_RGB2RGBA);
        
        const outData = new ImageData(new Uint8ClampedArray(rgbaMat.data), rgbaMat.cols, rgbaMat.rows);
        
        mat.delete();
        result.delete();
        rgbMat.delete();
        rgbaMat.delete();
        
        return outData;
    } else if (type === 'edge') {
        cv.cvtColor(mat, result, cv.COLOR_RGBA2GRAY);
        cv.Canny(result, result, 50, 150, 3, false);
        cv.cvtColor(result, result, cv.COLOR_GRAY2RGBA);
        
        const outData = new ImageData(new Uint8ClampedArray(result.data), result.cols, result.rows);
        mat.delete();
        result.delete();
        return outData;
    }
    
    mat.delete();
    result.delete();
    return imageData;
  }
}

export const cvProcessor = new OpenCVProcessor();
