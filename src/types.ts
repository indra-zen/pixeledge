export type AppView = 'CAMERA' | 'PROCESSING' | 'EDITOR';

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  sharpness: number; // For convolution matrix
  temperature: number; // -1 to 1 (blue to yellow)
  vignette: number; // 0 to 1
  grain: number; // 0 to 1
  blur?: number; // 0 to 1
}

export interface CustomFilter {
  id: number;
  name: string;
  settings: FilterSettings;
}

export interface Draft {
  id: number;
  imageBlob: Blob;
  timestamp: number;
}
