// Points the Android app at an API. Usage:
//   node scripts/set-api-url.mjs https://your-domain.co.za/api        (or set API_BASE_URL)
// Rewrites nativeApiBaseUrl in src/environments/environment.prod.ts (used by `npm run build`, i.e. release/CI builds).
// For debug builds against XAMPP use:  node scripts/set-api-url.mjs --dev http://192.168.1.50/SelectCutzApp_READY/SelectCutzApp/backend/api
import { readFile, writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const dev = args[0] === '--dev';
const url = (dev ? args[1] : args[0]) || process.env.API_BASE_URL || '';
if (!/^https?:\/\/[^\s'"]+$/.test(url)) {
  console.error('Give a full API URL, e.g. https://selectcutz.co.za/api  (or set API_BASE_URL).');
  process.exit(1);
}
if (!dev && !url.startsWith('https://')) console.warn('WARNING: a production API should use https://. Release builds block plain http by default.');
const file = dev ? 'src/environments/environment.ts' : 'src/environments/environment.prod.ts';
const source = await readFile(file, 'utf8');
const updated = source.replace(/nativeApiBaseUrl:\s*'[^']*'/, `nativeApiBaseUrl: '${url.replace(/\/$/, '')}'`);
if (updated === source && !source.includes(url.replace(/\/$/, ''))) { console.error(`nativeApiBaseUrl not found in ${file}`); process.exit(1); }
await writeFile(file, updated);
console.log(`${file}: nativeApiBaseUrl = ${url.replace(/\/$/, '')}`);
