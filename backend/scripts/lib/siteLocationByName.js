/**
 * Matches Site.name from DB (seed-sites-rakshak-list) → address for user seeding.
 * Keys must match site names exactly (case-insensitive trim).
 */
const BY_NAME = {
  Panchkula: { city: 'Panchkula', state: 'Haryana', pincode: '134109' },
  Chennai: { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
  Hyderabad: { city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
  'Banking Bhopal': { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  Bhopal: { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  Lucknow: { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226001' },
  Roorkee: { city: 'Roorkee', state: 'Uttarakhand', pincode: '247667' },
  Kolkata: { city: 'Kolkata', state: 'West Bengal', pincode: '700001' },
  Jaipur: { city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
  'Plaza 106 Gurugram': { city: 'Gurugram', state: 'Haryana', pincode: '122002' },
  'Gurugram 106': { city: 'Gurugram', state: 'Haryana', pincode: '122018' },
  'Noida Corporate': { city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  Ahmedabad: { city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  Jodhpur: { city: 'Jodhpur', state: 'Rajasthan', pincode: '342001' },
  Sonipat: { city: 'Sonipat', state: 'Haryana', pincode: '131001' },
  'Dwarka Sec 11': { city: 'New Delhi', state: 'Delhi', pincode: '110075' },
  'South Delhi': { city: 'New Delhi', state: 'Delhi', pincode: '110017' },
  AIIMS: { city: 'New Delhi', state: 'Delhi', pincode: '110029' },
  'Delhi Sec 17': { city: 'New Delhi', state: 'Delhi', pincode: '110017' },
  'Noida Office': { city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  Odisha: { city: 'Bhubaneswar', state: 'Odisha', pincode: '751001' },
  Nagpur: { city: 'Nagpur', state: 'Maharashtra', pincode: '440001' },
  MP: { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  Satna: { city: 'Satna', state: 'Madhya Pradesh', pincode: '485001' },
  Damoh: { city: 'Damoh', state: 'Madhya Pradesh', pincode: '470661' },
  Chhatarpur: { city: 'Chhatarpur', state: 'Madhya Pradesh', pincode: '471001' },
  'Sitex Pitampura': { city: 'Delhi', state: 'Delhi', pincode: '110034' },
  Dewas: { city: 'Dewas', state: 'Madhya Pradesh', pincode: '455001' },
  Pithampur: { city: 'Pithampur', state: 'Madhya Pradesh', pincode: '454775' },
  Narmadapuram: { city: 'Narmadapuram', state: 'Madhya Pradesh', pincode: '461001' },
  Datia: { city: 'Datia', state: 'Madhya Pradesh', pincode: '475661' },
  Mandla: { city: 'Mandla', state: 'Madhya Pradesh', pincode: '481661' },
  Narsinghpur: { city: 'Narsinghpur', state: 'Madhya Pradesh', pincode: '487001' },
  Umaria: { city: 'Umaria', state: 'Madhya Pradesh', pincode: '484661' },
  Anuppur: { city: 'Anuppur', state: 'Madhya Pradesh', pincode: '484224' },
  Shahdol: { city: 'Shahdol', state: 'Madhya Pradesh', pincode: '484001' },
  Rewa: { city: 'Rewa', state: 'Madhya Pradesh', pincode: '486001' },
  Chhindwara: { city: 'Chhindwara', state: 'Madhya Pradesh', pincode: '480001' },
  Chandigarh: { city: 'Chandigarh', state: 'Chandigarh', pincode: '160001' },
  Banking: { city: 'Bhopal', state: 'Madhya Pradesh', pincode: '462001' },
  'Dwarka Sec 17': { city: 'New Delhi', state: 'Delhi', pincode: '110075' }
};

function normalizeKey(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function getLocationForSiteName(siteName) {
  const n = normalizeKey(siteName);
  if (!n) return null;
  const exact = BY_NAME[n];
  if (exact) return { ...exact, street: `Rakshak Securitas, ${n}` };
  const lower = n.toLowerCase();
  for (const [k, v] of Object.entries(BY_NAME)) {
    if (k.toLowerCase() === lower) return { ...v, street: `Rakshak Securitas, ${k}` };
  }
  return {
    street: `Rakshak Securitas, ${n}`,
    city: n,
    state: 'India',
    pincode: '110001'
  };
}

module.exports = { getLocationForSiteName, BY_NAME };
