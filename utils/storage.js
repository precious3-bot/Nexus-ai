import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFilePath = path.join(__dirname, '..', 'data', 'store.json');

function ensureStoreFile() {
  const storeDir = path.dirname(dataFilePath);
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify({ users: [] }, null, 2));
  }
}

export function loadStore() {
  ensureStoreFile();
  const raw = fs.readFileSync(dataFilePath, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
    };
  } catch (error) {
    return { users: [] };
  }
}

export function saveStore(store) {
  ensureStoreFile();
  fs.writeFileSync(dataFilePath, JSON.stringify(store, null, 2));
}
