import { FilterSettings } from '../types';

export const getFilterCSS = (s: FilterSettings) => { 
  return `brightness(${(1 + s.brightness) * 100}%) contrast(${s.contrast * 100}%) saturate(${s.saturation * 100}%) hue-rotate(${s.hue * 360}deg)${s.blur ? ` blur(${s.blur * 2}px)` : ''}`; 
};

export const BUILT_IN_FILTERS: { name: string, settings: FilterSettings }[] = [
  { name: 'Normal', settings: { brightness: 0, contrast: 1, saturation: 1, hue: 0, sharpness: 0, grain: 0, temperature: 0, vignette: 0, blur: 0 } },
  { name: 'Vintage', settings: { brightness: 0.1, contrast: 0.8, saturation: 0.5, hue: 0.1, sharpness: 0.2, grain: 0.15, temperature: 0.3, vignette: 0.5, blur: 0 } },
  { name: 'Cyberpunk', settings: { brightness: 0.1, contrast: 1.5, saturation: 1.8, hue: 0.8, sharpness: 0.5, grain: 0.05, temperature: -0.2, vignette: 0.4, blur: 0 } },
  { name: 'Grayscale', settings: { brightness: 0, contrast: 1.2, saturation: 0, hue: 0, sharpness: 0, grain: 0.05, temperature: 0, vignette: 0, blur: 0 } },
  { name: 'Cinematic', settings: { brightness: -0.1, contrast: 1.3, saturation: 0.8, hue: 0, sharpness: 0.3, grain: 0.08, temperature: -0.1, vignette: 0.6, blur: 0 } },
  { name: 'Washed Out', settings: { brightness: 0.2, contrast: 0.6, saturation: 0.4, hue: 0, sharpness: 0, grain: 0, temperature: 0, vignette: 0, blur: 0 } },
  { name: 'Neon', settings: { brightness: 0.1, contrast: 1.8, saturation: 2.5, hue: 0.5, sharpness: 0.8, grain: 0, temperature: 0, vignette: 0, blur: 0 } },
  { name: 'Sepiaish', settings: { brightness: 0.05, contrast: 0.9, saturation: 0.6, hue: -0.1, sharpness: 0.1, grain: 0.08, temperature: 0.5, vignette: 0.3, blur: 0 } },
  { name: 'Polaroid', settings: { brightness: 0.15, contrast: 0.9, saturation: 0.8, hue: -0.05, sharpness: 0, grain: 0.12, temperature: 0.2, vignette: 0.4, blur: 0 } },
  { name: 'Noir', settings: { brightness: -0.15, contrast: 1.5, saturation: 0, hue: 0, sharpness: 0.5, grain: 0.2, temperature: 0, vignette: 0.7, blur: 0 } },
  { name: 'Vibrant', settings: { brightness: 0.05, contrast: 1.2, saturation: 1.5, hue: 0, sharpness: 0.2, grain: 0, temperature: 0.1, vignette: 0.1, blur: 0 } },
  { name: 'Matte', settings: { brightness: 0.1, contrast: 0.85, saturation: 0.9, hue: 0, sharpness: 0, grain: 0.05, temperature: -0.05, vignette: 0.2, blur: 0 } },
  { name: 'Cool Ice', settings: { brightness: 0.05, contrast: 1.1, saturation: 0.9, hue: 0, sharpness: 0.1, grain: 0, temperature: -0.4, vignette: 0.2, blur: 0 } },
  { name: 'Warm Sun', settings: { brightness: 0.1, contrast: 1.1, saturation: 1.2, hue: 0, sharpness: 0, grain: 0, temperature: 0.5, vignette: 0.2, blur: 0 } },
  { name: 'Dramatic', settings: { brightness: -0.2, contrast: 1.6, saturation: 1.1, hue: 0, sharpness: 0.4, grain: 0.1, temperature: 0.1, vignette: 0.8, blur: 0 } },
  { name: 'Fade', settings: { brightness: 0.15, contrast: 0.7, saturation: 0.6, hue: 0, sharpness: 0, grain: 0.1, temperature: 0.1, vignette: 0.3, blur: 0 } },
  { name: 'Dreamy', settings: { brightness: 0.15, contrast: 0.9, saturation: 1.1, hue: 0, sharpness: -0.5, grain: 0, temperature: 0.1, vignette: 0, blur: 0.3 } },
  { name: 'Retro 80s', settings: { brightness: 0, contrast: 1.4, saturation: 1.6, hue: -0.1, sharpness: 0.6, grain: 0.15, temperature: 0.2, vignette: 0.5, blur: 0 } },
  { name: 'Lomo', settings: { brightness: -0.05, contrast: 1.5, saturation: 1.3, hue: 0, sharpness: 0.3, grain: 0.05, temperature: 0.1, vignette: 0.9, blur: 0 } },
  { name: 'High Contrast', settings: { brightness: 0, contrast: 1.8, saturation: 1.1, hue: 0, sharpness: 0.5, grain: 0, temperature: 0, vignette: 0.2, blur: 0 } }
];
