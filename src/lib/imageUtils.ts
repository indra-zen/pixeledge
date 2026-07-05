export async function calculateHistogram(imageData: ImageData, bins: number = 32): Promise<number[]> {
  const { data } = imageData;
  const result = new Array(bins).fill(0);
  let maxVal = 0;
  
  // Convert RGBA to Grayscale and bucketize
  const binSize = 256 / bins;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Luminance
    const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const binIndex = Math.min(bins - 1, Math.floor(l / binSize));
    result[binIndex]++;
    if (result[binIndex] > maxVal) {
      maxVal = result[binIndex];
    }
  }
  
  if (maxVal > 0) {
    for (let i = 0; i < bins; i++) {
      result[i] = (result[i] / maxVal) * 100;
    }
  }
  
  return result;
}
