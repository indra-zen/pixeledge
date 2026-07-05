import { OpenCVProcessor } from './opencv';

const processor = new OpenCVProcessor();

self.onmessage = async (e: MessageEvent) => {
  const { id, imageData, type } = e.data;
  
  try {
    const processed = await processor.processImage(imageData, type);
    self.postMessage({ id, success: true, processed });
  } catch (error) {
    self.postMessage({ id, success: false, error: String(error) });
  }
};
