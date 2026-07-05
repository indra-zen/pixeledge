export type AppView = 'CAMERA' | 'PROCESSING' | 'EDITOR';

export interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  sharpness: number; // For convolution matrix
  grain: number;
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
