import { OpenCVProcessor } from './opencv';

const processor = new OpenCVProcessor();

self.onmessage = async (e: MessageEvent) => {
  const { id, imageData, type } = e.data;
  
  try {
    const processed = await processor.processImage(imageData, type);
    (self as unknown as Worker).postMessage({ id, success: true, processed }, [processed.data.buffer]);
  } catch (error) {
    (self as unknown as Worker).postMessage({ id, success: false, error: String(error) });
  }
};
