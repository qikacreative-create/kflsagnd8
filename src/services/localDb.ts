import { openDB } from 'idb';

const DB_NAME = 'KafelaLocalDB';
const STORE_NAME = 'media';

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

/**
 * Simpan data media (Logo / Tanda Tangan) terisolasi per-owner
 */
export const saveMedia = async (
  key: string,
  data: Blob | string,
  ownerId?: string
): Promise<void> => {
  const db = await dbPromise;
  const isolatedKey = ownerId ? `${ownerId}_${key}` : key;
  await db.put(STORE_NAME, data, isolatedKey);
};

/**
 * Ambil data media dengan prioritas isolasi per-owner, dengan fallback ke kunci warisan jika ada
 */
export const getMedia = async (
  key: string,
  ownerId?: string
): Promise<Blob | string | undefined> => {
  const db = await dbPromise;
  if (ownerId) {
    const isolatedVal = await db.get(STORE_NAME, `${ownerId}_${key}`);
    if (isolatedVal !== undefined) return isolatedVal;
  }
  return await db.get(STORE_NAME, key);
};

/**
 * Hapus data media terisolasi maupun kunci warisan
 */
export const deleteMedia = async (key: string, ownerId?: string): Promise<void> => {
  const db = await dbPromise;
  if (ownerId) {
    await db.delete(STORE_NAME, `${ownerId}_${key}`);
  }
  await db.delete(STORE_NAME, key);
};
