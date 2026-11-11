export const people = { Preparer: 'Emma Chen', Reviewer: 'Daniel Roy' };

const products = [
  { name: 'Term Life', prior: 650, movement: 30, difference: 9 },
  { name: 'Whole Life', prior: 350, movement: 20, difference: 3 }
];

// Amounts are stored as integer tenths of CAD millions.
const reserve = (period, corrected = false) => products.map((p) => ({
  ...p,
  prior: period === 'sep' ? p.prior - p.movement : p.prior,
  difference: corrected ? 0 : p.difference
}));

export const catalog = {
  'assumptions-v7': { name: 'LIFE_CA_Assumptions_v7.xlsx', sheet: 'Control', version: 'v7', date: '2026-10-31' },
  'assumptions-v8': { name: 'LIFE_CA_Assumptions_v8.xlsx', sheet: 'Control', version: 'v8', date: '2026-10-31' },
  'assumptions-sep': { name: 'LIFE_CA_Assumptions_Sep_v7.xlsx', sheet: 'Control', version: 'v7', date: '2026-09-30' },
  'policies-oct': { name: 'LIFE_CA_InForce_202610.xlsx', sheet: 'Control', count: 184620, date: '2026-10-31' },
  'policies-sep': { name: 'LIFE_CA_InForce_202609.xlsx', sheet: 'Control', count: 183942, date: '2026-09-30' },
  'rollforward-oct': { name: 'LIFE_CA_Rollforward_202610.xlsx', sheet: 'Roll-forward', rows: reserve('oct', true) },
  'rollforward-sep': { name: 'LIFE_CA_Rollforward_202609.xlsx', sheet: 'Roll-forward', rows: reserve('sep', true) },
  'reserve-original': { name: 'LIFE_CA_Reserve_014.xlsx', sheet: 'Closing reserves', rows: reserve('oct') },
  'reserve-corrected': { name: 'LIFE_CA_Reserve_014_Corrected.xlsx', sheet: 'Closing reserves', rows: reserve('oct', true) },
  'reserve-sep': { name: 'LIFE_CA_Reserve_013.xlsx', sheet: 'Closing reserves', rows: reserve('sep', true) },
  'renewal-oct': { name: 'LIFE_CA_Renewal_014.xlsx', sheet: 'Renewals', count: 184620, date: '2026-10-31' },
  'renewal-sep': { name: 'LIFE_CA_Renewal_013.xlsx', sheet: 'Renewals', count: 183942, date: '2026-09-30' }
};

export const runs = {
  oct: { id: 'oct', period: 'October 2026', date: '2026-10-31', batch: '014', model: 'v24', baseline: 'September 2026', baselineFile: 'reserve-sep', expectedVersion: 'v8', count: 184620, started: '07:42:08', ended: '07:54:46', files: { assumptions:'assumptions-v7', policies:'policies-oct', rollforward:'rollforward-oct', reserve:'reserve-original', renewal:'renewal-oct' }, choices: { assumptions: ['assumptions-v7','assumptions-v8'], reserve: ['reserve-original','reserve-corrected'], renewal: ['renewal-oct', null] } },
  sep: { id: 'sep', period: 'September 2026', date: '2026-09-30', batch: '013', model: 'v23', baseline: 'August 2026', expectedVersion: 'v7', count: 183942, started: '07:35:10', ended: '07:46:19', files: { assumptions:'assumptions-sep', policies:'policies-sep', rollforward:'rollforward-sep', reserve:'reserve-sep', renewal:'renewal-sep' }, choices: {} }
};

export const slots = { assumptions:'Assumptions', policies:'In-force policies', rollforward:'Reserve roll-forward', reserve:'Closing reserves', renewal:'Renewal output' };
export const checks = { reserve:'Reserve roll-forward', assumptions:'Assumptions version', policies:'In-force control totals', renewal:'Renewal record count' };
