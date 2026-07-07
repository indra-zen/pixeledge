const lucide = require('lucide-react');
const icons = ['Sun', 'Contrast', 'Droplet', 'Palette', 'Thermometer', 'Focus', 'Droplets', 'Aperture', 'Sparkles', 'Undo2', 'Redo2', 'Undo', 'Redo', 'Save'];
icons.forEach(i => {
  if (lucide[i]) console.log(i + ' exists');
  else console.log(i + ' MISSING');
});
