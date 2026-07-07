export interface ImageStats {
  meanLuminance: number;
  contrast: number;
  avgR: number;
  avgG: number;
  avgB: number;
}

export async function calculateHistogram(imageData: ImageData, bins: number = 64): Promise<{ r: number[], g: number[], b: number[], l: number[], stats: ImageStats }> {
  const { data } = imageData;
  const rResult = new Array(bins).fill(0);
  const gResult = new Array(bins).fill(0);
  const bResult = new Array(bins).fill(0);
  const lResult = new Array(bins).fill(0);
  
  let maxR = 0, maxG = 0, maxB = 0, maxL = 0;
  
  const binSize = 256 / bins;
  
  const totalPixels = data.length / 4;
  const targetSamples = 100000;
  let stride = Math.max(1, Math.floor(totalPixels / targetSamples));
  const step = stride * 4;
  
  let sumL = 0, sumR = 0, sumG = 0, sumB = 0;
  let lValues: number[] = [];

  for (let i = 0; i < data.length; i += step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const l = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    
    sumR += r;
    sumG += g;
    sumB += b;
    sumL += l;
    lValues.push(l);

    const rBin = Math.min(bins - 1, Math.floor(r / binSize));
    const gBin = Math.min(bins - 1, Math.floor(g / binSize));
    const bBin = Math.min(bins - 1, Math.floor(b / binSize));
    const lBin = Math.min(bins - 1, Math.floor(l / binSize));
    
    rResult[rBin]++;
    gResult[gBin]++;
    bResult[bBin]++;
    lResult[lBin]++;
    
    if (rResult[rBin] > maxR) maxR = rResult[rBin];
    if (gResult[gBin] > maxG) maxG = gResult[gBin];
    if (bResult[bBin] > maxB) maxB = bResult[bBin];
    if (lResult[lBin] > maxL) maxL = lResult[lBin];
  }
  
  const sampledCount = lValues.length;
  const meanLuminance = sumL / sampledCount;
  
  let variance = 0;
  for (let i = 0; i < sampledCount; i++) {
    const diff = lValues[i] - meanLuminance;
    variance += diff * diff;
  }
  variance /= sampledCount;
  const contrast = Math.sqrt(variance);

  const normalize = (arr: number[], max: number) => {
    if (max > 0) {
      for (let i = 0; i < bins; i++) {
        arr[i] = (arr[i] / max) * 100;
      }
    }
    return arr;
  };
  
  return {
    r: normalize(rResult, maxR),
    g: normalize(gResult, maxG),
    b: normalize(bResult, maxB),
    l: normalize(lResult, maxL),
    stats: {
      meanLuminance,
      contrast,
      avgR: sumR / sampledCount,
      avgG: sumG / sampledCount,
      avgB: sumB / sampledCount
    }
  };
}
