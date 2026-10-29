// تخزين JSON في Netlify Blobs، أو في ملفات محلية أثناء التطوير (MIZAN_LOCAL_STORE).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const STORE_NAME = 'mizan';
let implPromise;

function localImpl(dir) {
  const file = (key) => path.join(dir, `${key.replaceAll('/', '__')}.json`);
  return {
    async get(key) {
      try {
        return JSON.parse(await readFile(file(key), 'utf8'));
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
      }
    },
    async set(key, value) {
      await mkdir(dir, { recursive: true });
      await writeFile(file(key), JSON.stringify(value));
    },
  };
}

async function blobsImpl() {
  const { getStore } = await import('@netlify/blobs');
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  return {
    get: (key) => store.get(key, { type: 'json' }),
    set: (key, value) => store.setJSON(key, value),
  };
}

function impl() {
  const localDir = process.env.MIZAN_LOCAL_STORE;
  implPromise ??= localDir ? Promise.resolve(localImpl(localDir)) : blobsImpl();
  return implPromise;
}

export async function readJSON(key) {
  try {
    return await (await impl()).get(key);
  } catch (e) {
    console.error(`store read failed (${key}):`, e.message);
    return null;
  }
}

export async function writeJSON(key, value) {
  try {
    await (await impl()).set(key, value);
    return true;
  } catch (e) {
    console.error(`store write failed (${key}):`, e.message);
    return false;
  }
}
