import * as lucide from 'lucide-react';
const icons = ['Crop'];
icons.forEach(i => {
  if (lucide[i as keyof typeof lucide]) console.log(i + ' exists');
  else console.log(i + ' MISSING');
});
