// Seed locations are copied from the linked listings below; check current ground conditions before travel.
export const stations = [
  { id: 'shyambazar', name: 'Shyambazar', line: 'Blue Line', lat: 22.60134, lng: 88.3725, source: 'https://mapcarta.com/N5421546974' },
  { id: 'jatin-das-park', name: 'Jatin Das Park', line: 'Blue Line', lat: 22.52415, lng: 88.34647, source: 'https://mapcarta.com/N5421540159' },
  { id: 'central', name: 'Central', line: 'Blue Line', lat: 22.57249, lng: 88.35874, source: 'https://mapcarta.com/N5421528426' },
  { id: 'netaji-bhavan', name: 'Netaji Bhavan', line: 'Blue Line', lat: 22.53318, lng: 88.34593, source: 'https://mapcarta.com/N5421541284' },
  { id: 'central-park', name: 'Central Park', line: 'Green Line', lat: 22.59047, lng: 88.41563, source: 'https://mapcarta.com/N7976140060' },
  { id: 'city-centre', name: 'City Centre', line: 'Green Line', lat: 22.5871, lng: 88.40789, source: 'https://mapcarta.com/N7976140063' },
];

export const pandals = [
  { id: 'bagbazar', name: 'Bagbazar Sarbojanin', area: 'Bagbazar', lat: 22.6033, lng: 88.3664, station: 'shyambazar', walk: '650 m · about 8 min', knownFor: 'A much-loved traditional North Kolkata puja.', source: 'https://sealdah.in/pandalchitra/pandals/bagbazar-sarbojanin' },
  { id: 'friends-union', name: "Friends' Union", area: 'Belgachia', lat: 22.60303, lng: 88.37436, station: 'shyambazar', walk: '340 m · about 5 min', knownFor: 'A neighbourhood puja near B. Sen Street.', source: 'https://www.pujomap.com/p/friends-union' },
  { id: 'shyam-square', name: 'Shyam Square', area: 'Shyambazar', lat: 22.60093, lng: 88.36877, station: 'shyambazar', walk: '420 m · about 6 min', knownFor: 'A central stop in the Shyambazar puja cluster.', source: 'https://www.pujomap.com/p/shyam-square' },
  { id: 'tala-barowari', name: 'Tala Barowari', area: 'Shyambazar', lat: 22.60681, lng: 88.37488, station: 'shyambazar', walk: '820 m · about 12 min', knownFor: 'A North Kolkata puja near Tala Flyover.', source: 'https://www.pujomap.com/p/tala-barowari' },
  { id: 'sangha-sree', name: 'Sangha Sree', area: 'Hazra', lat: 22.52192, lng: 88.34591, station: 'jatin-das-park', walk: '290 m · about 4 min', knownFor: 'A South Kolkata pandal on Sadananda Road.', source: 'https://www.pujomap.com/p/sangha-sree' },
  { id: 'forward-club', name: 'Forward Club', area: 'Kalighat', lat: 22.52313, lng: 88.34363, station: 'jatin-das-park', walk: '440 m · about 7 min', knownFor: 'A Kalighat neighbourhood puja near Kalighat Road.', source: 'https://www.pujomap.com/p/forward-club' },
  { id: 'shree-sangha', name: 'Shree Sangha', area: 'Chetla', lat: 22.52076, lng: 88.34491, station: 'jatin-das-park', walk: '560 m · about 8 min', knownFor: 'A Chetla puja near S. N. Road.', source: 'https://www.pujomap.com/p/shree-sangha' },
  { id: 'bakul-bagan', name: 'Bakul Bagan Sarbojanin', area: 'Lake Gardens', lat: 22.52682, lng: 88.34795, station: 'jatin-das-park', walk: '480 m · about 7 min', knownFor: 'A Lake Gardens stop on P. Mullick Road.', source: 'https://www.pujomap.com/p/bakul-bagan-sarbojanin' },
  { id: 'ekdalia-evergreen', name: 'Ekdalia Evergreen', area: 'Gariahat', lat: 22.52128, lng: 88.36623, station: 'jatin-das-park', walk: '2.4 km · about 36 min', knownFor: 'A major South Kolkata puja known for its traditional-style idol.', source: 'https://www.pujomap.com/p/ekdalia-evergreen' },
  { id: 'college-square', name: 'College Square', area: 'College Street', lat: 22.57453, lng: 88.36446, station: 'central', walk: '1.1 km · about 16 min', knownFor: 'A landmark College Street puja beside the square.', source: 'https://www.pujomap.com/p/college-square' },
  { id: 'maddox-square', name: 'Maddox Square', area: 'Gariahat', lat: 22.52651, lng: 88.35485, station: 'jatin-das-park', walk: '1.2 km · about 18 min', knownFor: 'A Gariahat puja known for its traditional-style idol.', source: 'https://www.pujomap.com/p/maddox-square' },
  { id: 'sreebhumi', name: 'Sreebhumi Sporting Club', area: 'Belgachia', lat: 22.60032, lng: 88.40259, station: 'central-park', walk: '2.3 km · about 34 min', knownFor: 'A large North Kolkata puja in Belgachia.', source: 'https://www.pujomap.com/p/sreebhumi-sporting-club' },
  { id: '21-pally', name: '21 Pally', area: 'Ballygunge', lat: 22.52924, lng: 88.36891, station: 'netaji-bhavan', walk: '2.8 km · about 35 min', knownFor: 'A Ballygunge puja near Broad Street.', source: 'https://www.pujomap.com/p/21-pally' },
  { id: 'ad-block', name: 'AD Block Durga Puja', area: 'Salt Lake', lat: 22.59705, lng: 88.40651, station: 'city-centre', walk: '1.1 km · about 14 min', knownFor: 'A Salt Lake neighbourhood puja at AD Park.', source: 'https://www.pujomap.com/p/ad-block-durga-puja' },
  { id: 'golmath', name: 'Golmath Durgapuja Samity', area: 'Kasba', lat: 22.52693, lng: 88.34954, station: 'jatin-das-park', walk: '760 m · about 11 min', knownFor: 'A Kasba puja close to the Maddox and Bakul Bagan cluster.', source: 'https://www.pujomap.com/p/golmath-durgapuja-samity' },
];

// Additional names and neighbourhoods transcribed from the user's sightseeing list.
// These entries have no independently sourced point, so they stay out of map pins
// and station-distance results until a location listing can be verified.
const areaOnlySeeds = [
  ['Kumartuli Park Sarbojanin', 'Kumartuli'], ['Ahiritola Sarbojanin', 'Ahiritola'],
  ['Hatibagan Sarbojanin', 'Hatibagan'], ['Nalin Sarkar Street Sarbojanin', 'Shyambazar'],
  ['Kashi Bose Lane Durga Puja', 'North Kolkata'], ['Sikdar Bagan Sadharan Durga Puja', 'Hatibagan'],
  ['Nabinpally Durga Puja', 'Hatibagan'], ['Tala Prattoy', 'Tala'],
  ['Chaltabagan Lohapatty', 'Maniktala'], ['Lalabagan Nabankur', 'Maniktala'],
  ['Hedua Park Durga Puja', 'Hedua'], ['Simla Byayam Samity', 'Simla'],
  ['Jagat Mukherjee Park', 'Shobhabazar'], ['Shyampukur Adi Sarbojanin', 'Shyampukur'],
  ['Surir Bagan Sarbojanin', 'Ultadanga'], ['Gouribari Sarbojanin', 'Gouribari'],
  ['Santosh Mitra Square Durga Puja', 'Bowbazar'], ['Mohammad Ali Park Durga Puja', 'Mahatma Gandhi Road'],
  ['Sealdah Railway Athletic Club Durga Puja', 'Sealdah'], ['Jorasanko 7-er Palli', 'Jorasanko'],
  ['Mitali Sangha Durga Puja', 'Kankurgachi'], ['Suruchi Sangha', 'New Alipore'],
  ['Tridhara Sammilani', 'Dhakuria'], ['Chetla Agrani', 'Chetla'],
  ['Badamtala Ashar Sangha', 'Kalighat'], ['Deshapriya Park Durga Puja', 'Deshapriya Park'],
  ['Hindustan Park Sarbojanin', 'Hindustan Park'], ['Ballygunge Cultural Association', 'Ballygunge'],
  ['Mudiali Club Durga Puja', 'Mudiali'], ['Samaj Sebi Sangha', 'Lake Gardens'],
  ['Jodhpur Park Sarbojanin', 'Jodhpur Park'], ['Jodhpur Park 95 Palli', 'Jodhpur Park'],
  ['Bosepukur Sitala Mandir', 'Kasba'], ['Bosepukur Talbagan', 'Kasba'],
  ['Chakraberia Sarbojanin', 'Chakraberia'], ['41 Pally Club', 'Haridevpur'],
  ['66 Pally Sarbojanin', 'Kalighat'], ['Naktala Udayan Sangha', 'Naktala'],
  ['Babubagan Sarbojanin', 'Dhakuria'], ['Rajdanga Naba Uday Sangha', 'Rajdanga'],
  ['Hindustan Club Durga Puja', 'Hindustan Park'], ['Abasar Sarbojanin', 'South Kolkata'],
  ['Ekush Palli Sarbojanin', 'Ballygunge'], ['Ballygunge 21 Pally', 'Ballygunge'],
  ['Bhowanipore 75 Palli', 'Bhowanipore'], ['Kalighat Milan Sangha', 'Kalighat'],
  ['Barisha Club Durga Puja', 'Behala'], ['Behala Club Durga Puja', 'Behala'],
  ['Behala Natun Dal', 'Behala'], ['Sree Sangha Behala', 'Behala'],
  ['Khidirpur 25 Palli', 'Kidderpore'], ['Alipore Sarbojanin', 'Alipore'],
  ['Dum Dum Park Tarun Sangha', 'Dum Dum Park'], ['Dum Dum Park Bharat Chakra', 'Dum Dum Park'],
  ['Dum Dum Park Sarbojanin', 'Dum Dum Park'], ['Lake Town Adhibasi Brinda', 'Lake Town'],
  ['Kestopur Prafulla Kanan', 'Kestopur'], ['Baguiati Railway Pukur United Club', 'Baguiati'],
  ['Kestopur Pragati Sangha', 'Kestopur'], ['FD Block Durga Puja', 'Salt Lake'],
  ['AE Block Durga Puja', 'Salt Lake'], ['BJ Block Durga Puja', 'Salt Lake'],
  ['BD Block Durga Puja', 'Salt Lake'], ['AK Block Durga Puja', 'Salt Lake'],
  ['Labony Estate Durga Puja', 'Salt Lake'], ['New Town BG Block Durga Puja', 'New Town'],
  ['Shobhabazar Rajbari Durga Puja', 'Shobhabazar'], ['Chatu Babu Latu Babu Bari', 'Beadon Street'],
  ['Laha Bari Durga Puja', 'North Kolkata'], ['Rani Rashmoni Bari Durga Puja', 'Janbazar'],
  ['Hathkhola Dutta Bari', 'North Kolkata'], ['Pathuriaghata Ghosh Bari', 'North Kolkata'],
];

const normalizeName = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const alreadyCovered = new Set(pandals.map((p) => normalizeName(p.name)));
// The pasted guide uses a few longer variants of already pinned names.
['Bagbazar Sarbojanin Durgotsav', 'College Square Sarbojanin', 'Ekdalia Evergreen Club Durga Puja', 'Maddox Square Durga Puja', 'Sreebhumi Sporting Club', 'Singhi Park Sarbojanin'].forEach((name) => alreadyCovered.add(normalizeName(name)));
for (const [name, area] of areaOnlySeeds) {
  const id = normalizeName(name).slice(0, 48);
  if (!alreadyCovered.has(normalizeName(name))) {
    pandals.push({ id, name, area, lat: null, lng: null, station: null, walk: null, knownFor: 'Listed in the supplied sightseeing guide; exact location has not been verified.', source: null, locationStatus: 'area-only' });
    alreadyCovered.add(normalizeName(name));
  }
}

export const stationById = Object.fromEntries(stations.map((s) => [s.id, s]));
