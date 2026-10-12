import { MetroLine } from '../types';

export const METRO_LINES: MetroLine[] = [
  {
    id: 'blue-line',
    code: 'blue',
    name: 'Blue Line (Line 1)',
    color: '#0062B1',
    textColor: '#FFFFFF',
    description: 'North-South arterial line connecting Dakshineswar to Kavi Subhash (New Garia).',
    terminals: 'Dakshineswar ⇄ Kavi Subhash',
  },
  {
    id: 'green-line',
    code: 'green',
    name: 'Green Line (Line 2)',
    color: '#00875A',
    textColor: '#FFFFFF',
    description: 'East-West corridor linking Howrah, Sealdah, Phoolbagan, and Salt Lake Sector V.',
    terminals: 'Howrah Maidan ⇄ Sector V',
  },
  {
    id: 'purple-line',
    code: 'purple',
    name: 'Purple Line (Line 3)',
    color: '#7B2CBF',
    textColor: '#FFFFFF',
    description: 'Connecting Joka, Behala Chowrasta, Taratala, Majerhat and Kidderpore.',
    terminals: 'Joka ⇄ Majerhat / Esplanade',
  },
  {
    id: 'orange-line',
    code: 'orange',
    name: 'Orange Line (Line 6)',
    color: '#E8590C',
    textColor: '#FFFFFF',
    description: 'Southern bypass connecting Kavi Subhash to Ruby (Hemanta Mukhopadhyay).',
    terminals: 'Kavi Subhash ⇄ Hemanta Mukhopadhyay',
  },
];
