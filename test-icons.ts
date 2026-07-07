import * as lucide from 'lucide-react';
const icons = ['Sun', 'Contrast', 'Droplet', 'Palette', 'Thermometer', 'Focus', 'Droplets', 'Aperture', 'Sparkles', 'Undo2', 'Redo2', 'Undo', 'Redo', 'Save', 'Check'];
icons.forEach(i => {
  if (lucide[i as keyof typeof lucide]) console.log(i + ' exists');
  else console.log(i + ' MISSING');
});
