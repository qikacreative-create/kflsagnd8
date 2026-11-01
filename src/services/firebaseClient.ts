import { FirebaseApp, getApps, initializeApp, deleteApp } from 'firebase/app';
import {
  Auth,
  GoogleAuthProvider,
  User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  Firestore,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  AnggotaTimModel,
  BrandRegistryItem,
  FirebaseCustomConfig,
  JadwalFotografi,
  OwnerProfile,
  PaketLanggananTier,
  PaketLayanan,
  PelangganModel,
  RekeningModel,
  UserRoleType,
} from '../types/kafela';
import {
  bersihkanSlugBrand,
  buatLoginIdKru,
  idKeEmailSistem,
} from '../utils/formatters';
import { saveMedia } from './localDb';
import { getLimits } from '../utils/subscription';

const STORAGE_KEY_FB_CONFIG = 'KAFELA_FIREBASE_CONFIG_V1';

const DEFAULT_KAFELA_FIREBASE_CONFIG: FirebaseCustomConfig = {
  apiKey:
    (import.meta as any).env?.VITE_FIREBASE_API_KEY ||
    'AIzaSyDD0XFwZMZcKCc1CAoQTWkyXn-SpBd8x1M',
  authDomain:
    (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN ||
    'kafilasuci3.firebaseapp.com',
  projectId:
    (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID ||
    'kafilasuci3',
  storageBucket:
    (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET ||
    'kafilasuci3.firebasestorage.app',
  messagingSenderId:
    (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '178353487221',
  appId:
    (import.meta as any).env?.VITE_FIREBASE_APP_ID ||
    '1:178353487221:web:cc249260cc2808b313273c',
  firestoreDatabaseId:
    (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID ||
    '',
};

function getSavedFirebaseConfig(): FirebaseCustomConfig {
  try {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY_FB_CONFIG)) {
      localStorage.removeItem(STORAGE_KEY_FB_CONFIG);
    }
  } catch {
    // Abaikan jika akses localStorage dibatasi
  }
  return DEFAULT_KAFELA_FIREBASE_CONFIG;
}

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let connectionValidated = false;

async function testFirestoreConnection(dbInstance: Firestore): Promise<void> {
  if (connectionValidated) return;
  connectionValidated = true;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

export function initKafelaFirebase(customCfg?: FirebaseCustomConfig): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
} | null {
  const cfg = customCfg || getSavedFirebaseConfig();
  if (!cfg || !cfg.apiKey || !cfg.projectId) return null;

  const databaseId = cfg.firestoreDatabaseId?.trim() || undefined;

  try {
    const existing = getApps().find((a) => a.name === 'Kafelas AgendaPC');
    cachedApp = existing || initializeApp(cfg, 'Kafelas AgendaPC');
    cachedAuth = getAuth(cachedApp);

    if (!cachedDb) {
      try {
        // Aktifkan Native Persistent Cache Resmi Google Firebase pada database kafilasuci3
        cachedDb = initializeFirestore(
          cachedApp,
          {
            localCache: persistentLocalCache({
              tabManager: persistentMultipleTabManager(),
            }),
          },
          databaseId
        );
      } catch {
        // Fallback jika sudah pernah terinisialisasi
        cachedDb = databaseId ? getFirestore(cachedApp, databaseId) : getFirestore(cachedApp);
      }
      void testFirestoreConnection(cachedDb);
    }
    return { app: cachedApp, auth: cachedAuth, db: cachedDb };
  } catch (err) {
    console.error('Gagal menginisialisasi Firebase:', err);
    return null;
  }
}

export function listenFirebaseAuthState(
  callback: (
    session: {
      uid: string;
      targetOwnerId: string;
      role: UserRoleType;
      displayName: string;
      email?: string | null;
    } | null
  ) => void
): () => void {
  const fb = initKafelaFirebase();
  if (!fb) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(fb.auth, async (user: User | null) => {
    if (!user) {
      callback(null);
      return;
    }
    try {
      const resolved = await resolveUserRoleFromFirestore(fb.db, user.uid, user);
      callback({ ...resolved, email: user.email });
    } catch {
      callback({
        uid: user.uid,
        targetOwnerId: user.uid,
        role: 'owner',
        displayName: user.displayName || user.email || 'Owner',
        email: user.email,
      });
    }
  });
}

/**
 * Login via Nomor WhatsApp, Username Brand (cth: nadia.qikacreative), atau Email
 */
export async function loginFirebaseWithWA(
  waInput: string,
  password: string
): Promise<{
  uid: string;
  targetOwnerId: string;
  role: UserRoleType;
  displayName: string;
  email?: string | null;
}> {
  const fb = initKafelaFirebase();
  if (!fb) {
    throw new Error('Konfigurasi Firebase belum siap.');
  }

  const trimmed = waInput.trim();
  const emailSistem = idKeEmailSistem(trimmed);
  const cred = await signInWithEmailAndPassword(fb.auth, emailSistem, password);
  const userUid = cred.user.uid;

  const resolved = await resolveUserRoleFromFirestore(fb.db, userUid, cred.user);
  return { ...resolved, email: cred.user.email };
}

/**
 * Login / Daftar via Google (Persis seperti LoginActivity.kt & SignupActivity.kt)
 */
export async function loginFirebaseWithGoogle(): Promise<{
  uid: string;
  targetOwnerId: string;
  role: UserRoleType;
  displayName: string;
  email?: string | null;
}> {
  const fb = initKafelaFirebase();
  if (!fb) {
    throw new Error('Konfigurasi Firebase belum siap.');
  }

  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(fb.auth, provider);
  const user = cred.user;

  const ownerRef = doc(fb.db, 'owners', user.uid);
  const ownerSnap = await getDoc(ownerRef);

  if (!ownerSnap.exists()) {
    const masaTrialMillis = Date.now() + 10 * 24 * 60 * 60 * 1000;
    const namaGoogle = user.displayName || 'Owner';
    await setDoc(ownerRef, {
      uid: user.uid,
      namaOwner: namaGoogle,
      namaBrand: namaGoogle,
      username: bersihkanSlugBrand(namaGoogle) || 'studio',
      noWhatsApp: user.email || '',
      role: 'owner',
      ownerParentId: user.uid,
      paketAktif: 'Ultimate',
      tanggalDaftar: Date.now(),
      tanggalLangganan: masaTrialMillis,
    });
  }

  return {
    uid: user.uid,
    targetOwnerId: user.uid,
    role: 'owner',
    displayName: user.displayName || 'Owner',
    email: user.email,
  };
}

/**
 * Daftar Akun Baru via Nomor WA + Kata Sandi (Bonus Trial 10 Hari Ultimate)
 */
export async function signupFirebaseWithWA(
  namaOwner: string,
  namaBrand: string,
  waInput: string,
  password: string
): Promise<{
  uid: string;
  targetOwnerId: string;
  role: UserRoleType;
  displayName: string;
  email?: string | null;
}> {
  const fb = initKafelaFirebase();
  if (!fb) {
    throw new Error('Konfigurasi Firebase belum siap.');
  }

  const emailSistem = idKeEmailSistem(waInput);
  if (!emailSistem || !emailSistem.includes('@') || emailSistem.startsWith('@')) {
    throw new Error('Format Nomor WhatsApp atau Email tidak valid.');
  }

  const isEmailInput = waInput.includes('@') && waInput.includes('.');
  let waBersih = waInput;
  if (!isEmailInput) {
    waBersih = waInput.replace(/[^0-9]/g, '');
    if (waBersih.startsWith('62')) {
      waBersih = '0' + waBersih.substring(2);
    }
    if (!waBersih || waBersih.length < 9) {
      throw new Error('Nomor WhatsApp terlalu pendek atau tidak valid.');
    }
  }
  const cred = await createUserWithEmailAndPassword(fb.auth, emailSistem, password);
  const uid = cred.user.uid;
  const masaTrialMillis = Date.now() + 10 * 24 * 60 * 60 * 1000;

  await setDoc(doc(fb.db, 'owners', uid), {
    uid,
    namaOwner,
    namaBrand,
    username: bersihkanSlugBrand(namaBrand) || 'studio',
    noWhatsApp: waBersih,
    role: 'owner',
    ownerParentId: uid,
    paketAktif: 'Ultimate',
    tanggalDaftar: Date.now(),
    tanggalLangganan: masaTrialMillis,
  });

  return {
    uid,
    targetOwnerId: uid,
    role: 'owner',
    displayName: namaOwner,
    email: cred.user.email,
  };
}

export async function resolveUserRoleFromFirestore(
  db: Firestore,
  userUid: string,
  authUser?: User | null
): Promise<{
  uid: string;
  targetOwnerId: string;
  role: UserRoleType;
  displayName: string;
}> {
  // 1. Cek di koleksi tim_studio/{userUid} TERLEBIH DAHULU (agar staf/admin terbaca benar sebagai staf/admin dari studio owner)
  try {
    const timDoc = await getDoc(doc(db, 'tim_studio', userUid));
    if (timDoc.exists()) {
      const data = timDoc.data();
      const roleRaw = ((data.role as string) || 'anggota').toLowerCase();
      const parentId = (data.ownerParentId as string) || userUid;
      return {
        uid: userUid,
        targetOwnerId: parentId,
        role: roleRaw === 'admin' ? 'admin' : 'anggota',
        displayName: (data.nama as string) || 'Staf',
      };
    }
  } catch (e) {
    console.warn('Cek tim_studio gagal:', e);
  }

  // 2. Cek langsung di koleksi owners/{userUid} (1 bacaan dokumen tunggal — mencegah full scan koleksi owners saat Owner login/reload)
  try {
    const ownerDoc = await getDoc(doc(db, 'owners', userUid));
    if (ownerDoc.exists()) {
      const data = ownerDoc.data();
      return {
        uid: userUid,
        targetOwnerId: userUid,
        role: 'owner',
        displayName: (data.namaOwner as string) || (data.namaBrand as string) || 'Owner',
      };
    }
  } catch (e) {
    console.warn('Cek owners gagal:', e);
  }

  // 3. Auto-recovery khusus akun staf lawas yang belum tercatat di tim_studio/{userUid}
  try {
    const ownersSnap = await getDocs(collection(db, 'owners'));
    for (const ownerDocSnap of ownersSnap.docs) {
      const ownerId = ownerDocSnap.id;
      const staffDocRef = doc(db, 'owners', ownerId, 'tim', userUid);
      const staffSnap = await getDoc(staffDocRef);
      if (staffSnap.exists()) {
        const data = staffSnap.data();
        const roleRaw = ((data.role as string) || 'anggota').toLowerCase();
        const parentId = (data.ownerParentId as string) || ownerId;

        // Auto-heal tim_studio/{userUid} tanpa menyertakan sandi plaintext
        try {
          const { password: _omitPass, ...safeStaffIndex } = data;
          await setDoc(
            doc(db, 'tim_studio', userUid),
            {
              ...safeStaffIndex,
              uid: userUid,
              ownerParentId: parentId,
            },
            { merge: true }
          );
        } catch {}

        return {
          uid: userUid,
          targetOwnerId: parentId,
          role: roleRaw === 'admin' ? 'admin' : 'anggota',
          displayName: (data.nama as string) || 'Staf',
        };
      }
    }
  } catch (e) {
    console.warn('Cari tim di semua owners gagal:', e);
  }

  // Fallback jika akun Auth ada namun dokumen belum terbaca
  return {
    uid: userUid,
    targetOwnerId: userUid,
    role: 'owner',
    displayName: authUser?.displayName || 'Owner',
  };
}

/**
 * Tarik Seluruh Data Studio dari proyek kafilasuci3 database (default) dalam 1 Sesi Hemat
 */
export async function fetchOwnerWorkspaceFromFirebase(
  targetOwnerId: string
): Promise<{
  owner: OwnerProfile;
  rekening: RekeningModel;
  paketList: PaketLayanan[];
  jadwalAktif: JadwalFotografi[];
  jadwalArsip: JadwalFotografi[];
  timList: AnggotaTimModel[];
  pelangganList: PelangganModel[];
  totalReadsUsed: number;
}> {
  const fb = initKafelaFirebase();
  if (!fb) throw new Error('Firebase belum terhubung');

  let readsCount = 0;

  // 1. Baca Dokumen Owner
  const ownerRef = doc(fb.db, 'owners', targetOwnerId);
  const ownerSnap = await getDoc(ownerRef);
  readsCount += 1;
  const oData = ownerSnap.data() || {};

  const rawBrand = (oData.namaBrand as string) || "Kafela's Studio";
  const slugBrand =
    rawBrand
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 24) || 'kafelastudio';
  const resolvedUsername = ((oData.username as string) || '').trim() || slugBrand;

  // Jika dokumen owner belum memiliki field username di Firestore, langsung sinkronkan otomatis
  if (!oData.username || String(oData.username).trim() === '') {
    try {
      await setDoc(
        ownerRef,
        {
          uid: targetOwnerId,
          namaBrand: rawBrand,
          username: resolvedUsername,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Auto-sync username dilewati:', e);
    }
  }

  // Baca dari sub-koleksi galeri_web jika tersedia, jika tidak fallback ke dokumen utama
  let resolvedPortofolio: string[] = [];
  let resolvedCaptions: string[] = [];
  try {
    const galeriSnap = await getDocs(collection(fb.db, 'owners', targetOwnerId, 'galeri_web'));
    readsCount += Math.max(1, galeriSnap.size);
    
    if (galeriSnap.size > 0) {
      const galeriDocs = galeriSnap.docs.sort((a, b) => Number(a.id.replace('PORTO_', '')) - Number(b.id.replace('PORTO_', '')));
      resolvedPortofolio = galeriDocs.map(d => d.data().url as string || '');
      resolvedCaptions = galeriDocs.map(d => d.data().caption as string || '');
    } else if (Array.isArray(oData.portofolioWeb)) {
      // Fallback untuk data lama
      resolvedPortofolio = (oData.portofolioWeb as string[]).filter((u) => u && String(u).trim() !== '').slice(0, 8);
      resolvedCaptions = Array.isArray(oData.portofolioCaptions) ? (oData.portofolioCaptions as string[]).slice(0, 8) : [];
    }
  } catch (e) {
    console.warn('Gagal memuat galeri_web:', e);
  }

  const owner: OwnerProfile = {
    uid: targetOwnerId,
    namaOwner: (oData.namaOwner as string) || 'Owner',
    namaBrand: rawBrand,
    saldo: typeof oData.saldo === 'number' ? oData.saldo : (Number(oData.saldo) || 0),
    noWhatsApp: (oData.noWhatsApp as string) || '',
    email: (oData.email as string) || '',
    jenisUsaha: (oData.jenisUsaha as string) || 'Fotografi & Studio Foto',
    paketAktif: ((oData.paketAktif as string) || 'Pro') as OwnerProfile['paketAktif'],
    tanggalDaftar: Number(oData.tanggalDaftar) || Date.now(),
    tanggalLangganan: Number(oData.tanggalLangganan) || Date.now() + 30 * 86400000,
    username: resolvedUsername,
    taglineWeb: (oData.taglineWeb as string) || '',
    bioWeb: (oData.bioWeb as string) || '',
    linkIg: (oData.linkIg as string) || '',
    linkTiktok: (oData.linkTiktok as string) || '',
    linkYoutube: (oData.linkYoutube as string) || '',
    linkFacebook: (oData.linkFacebook as string) || '',
    lokasi1: (oData.lokasi1 as string) || '',
    lokasi2: (oData.lokasi2 as string) || '',
    lokasi3: (oData.lokasi3 as string) || '',
    logoBrandUrl: (oData.logoBrandUrl as string) || '/logo-kafela.svg',
    penempatanLogo: ((oData.penempatanLogo as string) || 'KEDUANYA') as OwnerProfile['penempatanLogo'],
    ttdUrl: (oData.ttdUrl as string) || '',
    portofolioWeb: resolvedPortofolio,
    portofolioCaptions: resolvedCaptions,
    temaWeb: ((oData.temaWeb as string) || 'MODERN_STUDIO') as OwnerProfile['temaWeb'],
    layoutWeb: ((oData.layoutWeb as string) || 'HORIZONTAL_BOOK') as OwnerProfile['layoutWeb'],
    pesanPenutupWeb: (oData.pesanPenutupWeb as string) || '',
    jamOperasionalWeb: (oData.jamOperasionalWeb as string) || '',
    ctaTeksKustom: (oData.ctaTeksKustom as string) || '',
    ctaLinkKustom: (oData.ctaLinkKustom as string) || '',
    teksTombolBooking: (oData.teksTombolBooking as string) || '',
    isWebsiteActive: oData.isWebsiteActive !== false,
    isBookingActive: oData.isBookingActive !== false,
    webProfil2: oData.webProfil2 ? (oData.webProfil2 as any) : undefined,
    templateWaTagihan:
      (oData.templateWaTagihan as string) ||
      'Halo kak [NAMA], kami dari [BRAND] menginformasikan untuk acara *[ACARA]* di [LOKASI], masih terdapat sisa tagihan sebesar *[SISA]*.\n\nPembayaran dapat ditransfer ke:\n[REKENING]\n\nTerima kasih!',
    templateWaKonfirmasi:
      (oData.templateWaKonfirmasi as string) ||
      'Halo kak [NAMA], kami dari [BRAND] ingin mengkonfirmasi jadwal untuk besok di [LOKASI]. Apakah sudah siap?',
    templateWaBookingWeb:
      (oData.templateWaBookingWeb as string) ||
      'Halo kak [NAMA], terima kasih sudah booking di [BRAND] untuk acara *[ACARA]* pada *[TANGGAL]*.\n\nTotal paket: [HARGA]\n\nSilakan transfer DP ke rekening:\n[REKENING]\n\nUntuk mengunci jadwal ya kak. Terima kasih!',
    warnaTema: (oData.warnaTema as string) || '#34495E',
    gayaLatarNavigasi: (oData.gayaLatarNavigasi as any) || undefined,
    opasitasNavigasi: typeof oData.opasitasNavigasi === 'number' ? oData.opasitasNavigasi : undefined,
    isKacaGelap: true,
    opasitasOverlay: 'D9',
    customBackgroundUrl: (oData.customBackgroundUrl as string) || undefined,
    customBackgroundBlur: typeof oData.customBackgroundBlur === 'number' ? oData.customBackgroundBlur : undefined,
    customBackgroundOpacity: typeof oData.customBackgroundOpacity === 'number' ? oData.customBackgroundOpacity : undefined,
    customBackgroundOverlayType: (oData.customBackgroundOverlayType as any) || undefined,
    opasitasKartu: typeof oData.opasitasKartu === 'number' ? oData.opasitasKartu : undefined,
  };

  // Cache Base64 logo & TTD ke IndexedDB secara background jika tersedia (terisolasi per-owner)
  if (owner.logoBrandUrl && owner.logoBrandUrl.startsWith('data:')) {
    saveMedia('logo', owner.logoBrandUrl, targetOwnerId).catch(() => {});
  }
  if (owner.ttdUrl && owner.ttdUrl.startsWith('data:')) {
    saveMedia('ttd', owner.ttdUrl, targetOwnerId).catch(() => {});
  }

  // 2. Baca Rekening
  let rekening: RekeningModel = {
    bankUtama: '',
    rekUtama: '',
    namaUtama: '',
    bankAlternatif: '',
    rekAlternatif: '',
    namaAlternatif: '',
    linkPembayaran: '',
    catatanRekening: '',
  };
  try {
    const rekSnap = await getDoc(doc(fb.db, 'owners', targetOwnerId, 'pengaturan', 'rekening'));
    readsCount += 1;
    const rData = rekSnap.data() || {};
    rekening = {
      bankUtama: (rData.bankUtama as string) || '',
      rekUtama: (rData.rekUtama as string) || '',
      namaUtama: (rData.namaUtama as string) || '',
      bankAlternatif: (rData.bankAlternatif as string) || (rData.bank2 as string) || '',
      rekAlternatif: (rData.rekAlternatif as string) || (rData.rek2 as string) || '',
      namaAlternatif: (rData.namaAlternatif as string) || (rData.nama2 as string) || '',
      linkPembayaran: (rData.linkPembayaran as string) || '',
      catatanRekening: (rData.catatanRekening as string) || '',
    };
  } catch (e) {
    console.warn('Gagal memuat rekening:', e);
  }

  // 3. Baca Paket Layanan (Tanpa orderBy di server agar dokumen lama tanpa field urutan tetap terbaca seperti di MasterPaketActivity.kt)
  let paketList: PaketLayanan[] = [];
  try {
    const paketSnap = await getDocs(
      collection(fb.db, 'owners', targetOwnerId, 'paket_layanan')
    );
    readsCount += Math.max(1, paketSnap.size);
    paketList = paketSnap.docs
      .map((d) => {
        const p = d.data();
        return {
          idPaket: (p.idPaket as string) || d.id,
          namaPaket: (p.namaPaket as string) || '',
          hargaPaket: Number(p.hargaPaket) || 0,
          deskripsiPaket:
            (p.deskripsiPaket as string) || (p.catatan as string) || (p.deskripsi as string) || '',
          urutan: p.urutan !== undefined ? Number(p.urutan) : 999,
        };
      })
      .sort((a, b) => a.urutan - b.urutan);
  } catch (e) {
    console.warn('Gagal memuat paket_layanan:', e);
  }

  // 4. Baca Jadwal Aktif
  let jadwalAktif: JadwalFotografi[] = [];
  try {
    const jadwalSnap = await getDocs(collection(fb.db, 'owners', targetOwnerId, 'jadwal'));
    readsCount += Math.max(1, jadwalSnap.size);
    jadwalAktif = jadwalSnap.docs.map((d) => mapFirestoreDocToJadwal(d.id, d.data()));
  } catch (e) {
    console.warn('Gagal memuat jadwal:', e);
  }

  // 5. Baca Tim
  let timList: AnggotaTimModel[] = [];
  try {
    const timSnap = await getDocs(collection(fb.db, 'owners', targetOwnerId, 'tim'));
    readsCount += Math.max(1, timSnap.size);
    timList = timSnap.docs.map((d) => {
      const t = d.data();
      const rawUser = (t.username as string) || (t.nama as string || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
      const rawLoginId = (t.loginId as string) || (rawUser ? buatLoginIdKru(rawUser, owner.namaBrand) : '');
      return {
        uid: (t.uid as string) || d.id,
        nama: (t.nama as string) || '',
        username: rawUser,
        loginId: rawLoginId,
        noWhatsApp: (t.noWhatsApp as string) || '',
        password: (t.password as string) || '',
        role: ((t.role as string) || 'anggota') as 'admin' | 'anggota',
        posisi: (t.posisi as string) || 'Crew',
        namaBrand: (t.namaBrand as string) || owner.namaBrand,
        ownerParentId: (t.ownerParentId as string) || targetOwnerId,
        tanggalDibuat: Number(t.tanggalDibuat) || Date.now(),
      };
    });
  } catch (e) {
    console.warn('Gagal memuat tim:', e);
  }

  // 6. Baca Arsip Kompresi
  const jadwalArsip: JadwalFotografi[] = [];
  try {
    const arsipSnap = await getDocs(collection(fb.db, 'owners', targetOwnerId, 'arsip_kompresi'));
    readsCount += Math.max(1, arsipSnap.size);
    arsipSnap.docs.forEach((docArsip) => {
      const arr = docArsip.data().data_event;
      if (Array.isArray(arr)) {
        arr.forEach((item: Record<string, unknown>) => {
          const mapped = mapFirestoreDocToJadwal((item.idJadwal as string) || '', item);
          mapped.isFromArchive = true;
          mapped.archiveDocId = docArsip.id;
          jadwalArsip.push(mapped);
        });
      }
    });
  } catch (e) {
    console.warn('Gagal memuat arsip_kompresi:', e);
  }

  // 7. Baca Pelanggan
  let pelangganList: PelangganModel[] = [];
  try {
    const pelangganSnap = await getDocs(collection(fb.db, 'owners', targetOwnerId, 'pelanggan'));
    readsCount += Math.max(1, pelangganSnap.size);
    pelangganList = pelangganSnap.docs.map((d) => d.data() as PelangganModel);
  } catch (e) {
    console.warn('Gagal memuat pelanggan:', e);
  }

  return {
    owner,
    rekening,
    paketList,
    jadwalAktif,
    jadwalArsip,
    timList,
    pelangganList,
    totalReadsUsed: readsCount,
  };
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const fb = initKafelaFirebase();
  const auth = fb?.auth;
  const user = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: user?.uid || null,
      email: user?.email || null,
      emailVerified: user?.emailVerified || null,
      isAnonymous: user?.isAnonymous || null,
      tenantId: user?.tenantId || null,
      providerInfo:
        user?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function subscribeLiveJadwalUltimate(
  targetOwnerId: string,
  onUpdate: (jadwalList: JadwalFotografi[], readDelta: number) => void,
  onError?: (err: Error) => void
): (() => void) | null {
  const fb = initKafelaFirebase();
  if (!fb) return null;

  // Pastikan user terotentikasi sebelum membuka listener streaming Firestore
  if (!fb.auth.currentUser) {
    return null;
  }

  const path = `owners/${targetOwnerId}/jadwal`;
  const colRef = collection(fb.db, 'owners', targetOwnerId, 'jadwal');
  return onSnapshot(
    colRef,
    (snap) => {
      const list = snap.docs.map((d) => mapFirestoreDocToJadwal(d.id, d.data()));
      const delta = Math.max(1, snap.docChanges().length);
      onUpdate(list, delta);
    },
    (error) => {
      console.warn(`Snapshot listener notice on ${path}:`, error.message);
      if (onError) {
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (wrapped) {
          onError(wrapped as Error);
        }
      }
    }
  );
}

export async function saveJadwalToFirebase(
  targetOwnerId: string,
  jadwal: JadwalFotografi
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;

  const docId = (jadwal.idJadwal || `JDW-${Date.now()}`).replace(/\//g, '_');
  const docRef = doc(fb.db, 'owners', targetOwnerId, 'jadwal', docId);
  const payload: Record<string, unknown> = {
    idJadwal: jadwal.idJadwal,
    namaAcara: jadwal.namaAcara,
    namaKlien: jadwal.namaKlien,
    namaPic: jadwal.namaPic || jadwal.namaKlien,
    waPic: jadwal.waPic,
    paket: jadwal.paket,
    lokasi: jadwal.lokasi,
    status: jadwal.status,
    hargaKotor: jadwal.hargaKotor,
    hargaPaketDasar: jadwal.hargaPaketDasar,
    namaTambahan: jadwal.namaTambahan,
    hargaTambahan: jadwal.hargaTambahan,
    diskon: jadwal.diskon,
    dpDibayar: jadwal.dpDibayar,
    catatan: jadwal.catatan,
    sumber: jadwal.sumber,
    waktuMulai: jadwal.waktuMulai,
    waktuSelesai: jadwal.waktuSelesai,
    tanggalMulai: jadwal.tanggalMulai,
    tanggalSelesaiEvent: jadwal.tanggalSelesaiEvent,
  };
  if (jadwal.attire) payload.attire = jadwal.attire;
  if (jadwal.fotoTeknis) payload.fotoTeknis = jadwal.fotoTeknis;
  if (jadwal.mcProtokol) payload.mcProtokol = jadwal.mcProtokol;
  if (jadwal.woKoordinasi) payload.woKoordinasi = jadwal.woKoordinasi;

  await setDoc(docRef, payload, { merge: true });
}

export async function deleteJadwalFromFirebase(
  targetOwnerId: string,
  idJadwal: string
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  const docId = (idJadwal || '').replace(/\//g, '_');
  await deleteDoc(doc(fb.db, 'owners', targetOwnerId, 'jadwal', docId));
}

export async function savePelangganToFirebase(
  targetOwnerId: string,
  pelanggan: PelangganModel
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  const docRef = doc(fb.db, 'owners', targetOwnerId, 'pelanggan', pelanggan.idPelanggan);
  await setDoc(docRef, pelanggan, { merge: true });
}

export async function deletePelangganFromFirebase(
  targetOwnerId: string,
  idPelanggan: string
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  await deleteDoc(doc(fb.db, 'owners', targetOwnerId, 'pelanggan', idPelanggan));
}

export async function restoreArsipToFirebase(
  targetOwnerId: string,
  jadwal: JadwalFotografi
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;

  await saveJadwalToFirebase(targetOwnerId, { ...jadwal, isFromArchive: false });
  if (jadwal.archiveDocId) {
    const arsipRef = doc(fb.db, 'owners', targetOwnerId, 'arsip_kompresi', jadwal.archiveDocId);
    const snap = await getDoc(arsipRef);
    if (snap.exists()) {
      const arr = snap.data().data_event;
      if (Array.isArray(arr)) {
        const match = arr.find((x: Record<string, unknown>) => x.idJadwal === jadwal.idJadwal);
        if (match) {
          await updateDoc(arsipRef, {
            data_event: arrayRemove(match),
          });
        }
      }
    }
  }
}

/**
 * Kompresi Otomatis & Manual Jadwal Lama (> 60 Hari / 2 Bulan) ke arsip_kompresi
 * Persis seperti fungsi bersihkanDanKompresArsipLama() di MainActivity.kt APK Android
 */
export async function compressOldSchedulesToFirebase(
  targetOwnerId: string,
  oldSchedules: JadwalFotografi[]
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb || !targetOwnerId || oldSchedules.length === 0) return;

  // Kelompokkan berdasarkan bulan (arsip_YYYY_MM)
  const grouped: Record<string, Record<string, unknown>[]> = {};
  for (const j of oldSchedules) {
    const ms = j.tanggalMulai || j.waktuMulai || Date.now();
    const d = new Date(ms);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const docArsipId = `arsip_${yyyy}_${mm}`;
    if (!grouped[docArsipId]) {
      grouped[docArsipId] = [];
    }
    const cleanPayload: Record<string, unknown> = {
      idJadwal: j.idJadwal,
      namaAcara: j.namaAcara,
      namaKlien: j.namaKlien,
      namaPic: j.namaPic || j.namaKlien,
      waPic: j.waPic,
      paket: j.paket,
      lokasi: j.lokasi,
      status: j.status,
      hargaKotor: j.hargaKotor,
      hargaPaketDasar: j.hargaPaketDasar,
      namaTambahan: j.namaTambahan,
      hargaTambahan: j.hargaTambahan,
      diskon: j.diskon,
      dpDibayar: j.dpDibayar,
      catatan: j.catatan,
      sumber: j.sumber,
      waktuMulai: j.waktuMulai,
      waktuSelesai: j.waktuSelesai,
      tanggalMulai: j.tanggalMulai,
      tanggalSelesaiEvent: j.tanggalSelesaiEvent,
    };
    if (j.attire) cleanPayload.attire = j.attire;
    if (j.fotoTeknis) cleanPayload.fotoTeknis = j.fotoTeknis;
    if (j.mcProtokol) cleanPayload.mcProtokol = j.mcProtokol;
    if (j.woKoordinasi) cleanPayload.woKoordinasi = j.woKoordinasi;

    grouped[docArsipId].push(cleanPayload);
  }

  for (const [docArsipId, items] of Object.entries(grouped)) {
    const arsipRef = doc(fb.db, 'owners', targetOwnerId, 'arsip_kompresi', docArsipId);
    await setDoc(
      arsipRef,
      {
        bulan_tahun: docArsipId,
        terakhir_diupdate: Date.now(),
        data_event: arrayUnion(...items),
      },
      { merge: true }
    );
  }

  // Hapus dari koleksi jadwal aktif setelah tersimpan di arsip_kompresi
  for (const j of oldSchedules) {
    const docId = (j.idJadwal || '').replace(/\//g, '_');
    await deleteDoc(doc(fb.db, 'owners', targetOwnerId, 'jadwal', docId));
  }
}

export async function savePaketToFirebase(
  targetOwnerId: string,
  paket: PaketLayanan
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  await setDoc(doc(fb.db, 'owners', targetOwnerId, 'paket_layanan', paket.idPaket), paket);
}

export async function deletePaketFromFirebase(
  targetOwnerId: string,
  idPaket: string
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  await deleteDoc(doc(fb.db, 'owners', targetOwnerId, 'paket_layanan', idPaket));
}

export async function saveOwnerProfileToFirebase(
  targetOwnerId: string,
  updates: Partial<OwnerProfile>
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  const cleanUpdates: Record<string, unknown> = { ...updates };
  if (typeof cleanUpdates.username === 'string') {
    cleanUpdates.username = cleanUpdates.username.trim().replace(/\s+/g, '');
  }

  // Simpan foto galeri ke sub-koleksi galeri_web dan hapus dari dokumen utama
  if (Array.isArray(updates.portofolioWeb)) {
    const rawPhotos = updates.portofolioWeb.slice(0, 8);
    const rawCaptions = Array.isArray(updates.portofolioCaptions)
      ? updates.portofolioCaptions.slice(0, 8)
      : [];
    
    // Simpan ke sub-koleksi galeri_web
    for (let idx = 0; idx < 8; idx++) {
      const u = (rawPhotos[idx] || '').trim();
      const cap = (rawCaptions[idx] || '').trim();
      const slotId = `PORTO_${idx + 1}`;
      
      if (u !== '') {
        await setDoc(doc(fb.db, 'owners', targetOwnerId, 'galeri_web', slotId), {
          url: u,
          caption: cap,
        });
      } else {
        // Hapus slot jika kosong
        try {
          await deleteDoc(doc(fb.db, 'owners', targetOwnerId, 'galeri_web', slotId));
        } catch {}
      }
    }
    // Hapus field lama dari dokumen utama
    delete cleanUpdates.portofolioWeb;
    delete cleanUpdates.portofolioCaptions;
  }

  await setDoc(doc(fb.db, 'owners', targetOwnerId), cleanUpdates, { merge: true });
}

export async function saveRekeningToFirebase(
  targetOwnerId: string,
  rekening: RekeningModel
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  await setDoc(doc(fb.db, 'owners', targetOwnerId, 'pengaturan', 'rekening'), rekening);
}

export async function logoutFirebaseSession(): Promise<void> {
  const fb = initKafelaFirebase();
  if (fb) {
    await signOut(fb.auth);
  }
}

export async function saveTimToFirebase(
  targetOwnerId: string,
  anggota: AnggotaTimModel
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;

  const brandSlug = bersihkanSlugBrand(anggota.namaBrand || '');
  const rawUser = (anggota.username || anggota.nama.split(' ')[0] || 'kru')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
  const username = rawUser || 'kru';
  const loginId = anggota.loginId || (brandSlug ? `${username}.${brandSlug}` : username);

  let waBersih = (anggota.noWhatsApp || '').replace(/[^0-9]/g, '');
  if (waBersih.startsWith('62')) {
    waBersih = '0' + waBersih.substring(2);
  }

  const password = anggota.password || '123456';
  const emailLoginId = idKeEmailSistem(loginId);
  const emailWa = waBersih.length >= 9 ? idKeEmailSistem(waBersih) : null;

  let userUid = anggota.uid || `staff_${Date.now()}`;

  // 1. Daftarkan akun auth berbasis Login ID (username.namabrand)
  try {
    const savedCfg = getSavedFirebaseConfig() || DEFAULT_KAFELA_FIREBASE_CONFIG;
    const secondaryApp = initializeApp(savedCfg, `StaffApp_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, emailLoginId, password);
    userUid = cred.user.uid;
    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
  } catch (authErr) {
    console.warn('Akun auth loginId staf mungkin sudah ada:', authErr);
  }

  // 2. Daftarkan juga akun auth berbasis WA jika nomor WA diisi (agar staf bisa login pakai WA ATAU username.brand)
  if (emailWa && emailWa !== emailLoginId) {
    try {
      const savedCfg = getSavedFirebaseConfig() || DEFAULT_KAFELA_FIREBASE_CONFIG;
      const secondaryAppWa = initializeApp(savedCfg, `StaffWaApp_${Date.now()}`);
      const secondaryAuthWa = getAuth(secondaryAppWa);
      const credWa = await createUserWithEmailAndPassword(secondaryAuthWa, emailWa, password);
      // Simpan indeks peran untuk UID nomor WA ini di tim_studio (tanpa sandi plaintext)
      const { password: _omitWaPass, ...safeWaMember } = anggota;
      const payloadWa = {
        ...safeWaMember,
        uid: credWa.user.uid,
        username,
        loginId,
        noWhatsApp: waBersih,
        ownerParentId: targetOwnerId,
      };
      await setDoc(doc(fb.db, 'tim_studio', credWa.user.uid), payloadWa, { merge: true });
      await signOut(secondaryAuthWa);
      await deleteApp(secondaryAppWa);
    } catch (authWaErr) {
      console.warn('Akun auth WA staf mungkin sudah ada:', authWaErr);
    }
  }

  const payload: AnggotaTimModel = {
    ...anggota,
    uid: userUid,
    username,
    loginId,
    noWhatsApp: waBersih,
    ownerParentId: targetOwnerId,
  };

  const { password: _omitIndexPass, ...indexPayload } = payload;

  await setDoc(doc(fb.db, 'owners', targetOwnerId, 'tim', userUid), payload, { merge: true });
  await setDoc(doc(fb.db, 'tim_studio', userUid), indexPayload, { merge: true });
}

/**
 * Validasi dan increment limit aktivitas harian (setings + foto)
 * Return true jika diizinkan, false jika diblokir
 */
export async function checkAndIncrementActions(
  targetOwnerId: string,
  paketAktif: string
): Promise<boolean> {
  const fb = initKafelaFirebase();
  if (!fb) return false;

  const ownerRef = doc(fb.db, 'owners', targetOwnerId);
  const snap = await getDoc(ownerRef);
  if (!snap.exists()) return false;
  
  const data = snap.data();
  const limits = getLimits(paketAktif);
  
  const lastReset = data.lastResetDate as number || 0;
  const now = Date.now();
  const isToday = new Date(lastReset).toDateString() === new Date(now).toDateString();
  
  let currentActions = isToday ? (data.actionsToday as number || 0) : 0;
  
  if (currentActions >= limits.maxDailyActions) {
    return false;
  }
  
  await updateDoc(ownerRef, {
    actionsToday: currentActions + 1,
    lastResetDate: isToday ? lastReset : now
  });
  
  return true;
}

export async function deleteTimFromFirebase(
  targetOwnerId: string,
  uid: string
): Promise<void> {
  const fb = initKafelaFirebase();
  if (!fb) return;
  await deleteDoc(doc(fb.db, 'owners', targetOwnerId, 'tim', uid));
  await deleteDoc(doc(fb.db, 'tim_studio', uid));
}

function parseNumberClean(val: unknown): number {
  if (typeof val === 'number' && !Number.isNaN(val)) return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9-]/g, '');
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }
  if (val && typeof val === 'object' && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function mapFirestoreDocToJadwal(id: string, d: Record<string, unknown>): JadwalFotografi {
  const waktuMulaiRaw = parseNumberClean(d.waktuMulai) || parseNumberClean(d.tanggalMulai) || Date.now();
  const tglMulai = parseNumberClean(d.tanggalMulai) || waktuMulaiRaw;
  const tglSelesaiRaw = parseNumberClean(d.tanggalSelesaiEvent);
  const tglSelesai = tglSelesaiRaw >= tglMulai ? tglSelesaiRaw : tglMulai;
  const hargaKotor = parseNumberClean(d.hargaKotor);
  const catatanStr = (d.catatan as string) || '';
  const statusStr = ((d.status as string) || 'Booking') as JadwalFotografi['status'];
  const sumberRaw = (d.sumber as string) || (d.asalBooking as string) || '';
  const isFromWeb =
    sumberRaw.toUpperCase().includes('WEB') ||
    statusStr.toLowerCase() === 'menunggu konfirmasi' ||
    catatanStr.toUpperCase().includes('VIA WEB') ||
    catatanStr.toUpperCase().includes('[WEB]');

  return {
    idJadwal: (d.idJadwal as string) || id,
    namaAcara: (d.namaAcara as string) || '',
    namaKlien: (d.namaKlien as string) || '',
    lokasi: (d.lokasi as string) || 'Studio',
    paket: (d.paket as string) || '',
    hargaPaketDasar: parseNumberClean(d.hargaPaketDasar) || hargaKotor,
    namaTambahan: (d.namaTambahan as string) || '',
    hargaTambahan: parseNumberClean(d.hargaTambahan),
    namaPic: (d.namaPic as string) || (d.namaKlien as string) || '',
    waPic: (d.waPic as string) || (d.noWa as string) || '',
    waktuMulai: waktuMulaiRaw,
    waktuSelesai: parseNumberClean(d.waktuSelesai),
    tanggalMulai: tglMulai,
    tanggalSelesaiEvent: tglSelesai,
    status: statusStr,
    hargaKotor,
    diskon: parseNumberClean(d.diskon),
    dpDibayar: parseNumberClean(d.dpDibayar) || parseNumberClean(d.dp),
    catatan: catatanStr,
    sumber: (isFromWeb ? 'WEB' : sumberRaw) as JadwalFotografi['sumber'],
    attire: d.attire as JadwalFotografi['attire'],
    fotoTeknis: d.fotoTeknis as JadwalFotografi['fotoTeknis'],
    mcProtokol: d.mcProtokol as JadwalFotografi['mcProtokol'],
    woKoordinasi: d.woKoordinasi as JadwalFotografi['woKoordinasi'],
  };
}

// ============================================================================
// BRAND REGISTRY (MULTI-TENANT & SUPER ADMIN 30+ BRANDS)
// ============================================================================

const LOCAL_KEY_BRANDS_REGISTRY = 'KAFELA_BRANDS_REGISTRY_V1';

export function getLocalCachedBrands(): BrandRegistryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY_BRANDS_REGISTRY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const realOnly = parsed.filter(
          (b) =>
            b.id === 'kfls' ||
            (!b.ownerId?.startsWith('owner-') &&
              !['kafilasuci', 'lensa-art', 'vogue-moment', 'sunset-studio', 'grand-ballroom', 'neo-cinema', 'purnama-decor', 'elixir-sound', 'baskoro-foto', 'harmoni-mua', 'velocity-drone', 'sagara-pro', 'signature-cake', 'lumina-photolab', 'aksara-mc', 'kencana-catering', 'aura-prewed', 'infinity-clip', 'flawless-mua', 'symphony-wo', 'fokus-lens', 'nostalgia-box', 'pesona-gaun', 'zenith-media', 'cinta-story', 'alunan-musik', 'gemilangtenda', 'gemilang-tenda', 'royal-heritage', 'studio-kita', 'blissful-event', 'radiant-cinema'].includes(b.slug))
        );
        return realOnly;
      }
    }
  } catch {}
  return [];
}

function saveLocalCachedBrands(list: BrandRegistryItem[]): void {
  try {
    localStorage.setItem(LOCAL_KEY_BRANDS_REGISTRY, JSON.stringify(list));
  } catch (err) {
    console.error('Gagal menyimpan cache brands:', err);
  }
}

/**
 * Mengambil seluruh registri brand dari Firestore.
 */
export async function fetchBrandsRegistryFromFirebase(): Promise<BrandRegistryItem[]> {
  const init = initKafelaFirebase();
  if (!init) {
    return getLocalCachedBrands();
  }

  try {
    const items: BrandRegistryItem[] = [];

    // 1. Ambil otomatis seluruh studio/owner dari koleksi 'owners' di Firestore
    try {
      const ownersSnap = await getDocs(collection(init.db, 'owners'));
      ownersSnap.forEach((docSnap) => {
        const d = docSnap.data();
        const ownerId = docSnap.id;
        const slug = (d.username as string) || (d.slug as string) || ownerId;
        const namaBrand = (d.namaBrand as string) || (d.namaOwner as string) || 'Studio';
        const noWhatsApp = (d.noWhatsApp as string) || '';
        const email = (d.email as string) || (noWhatsApp.includes('@') ? noWhatsApp : undefined);
        const tier = (d.paketAktif as BrandRegistryItem['tier']) || 'Ultimate';
        const tanggalDaftar = typeof d.tanggalDaftar === 'number' ? d.tanggalDaftar : Date.now();
        const tanggalLangganan = typeof d.tanggalLangganan === 'number' ? d.tanggalLangganan : Date.now() + 365 * 86400000;
        const saldo = typeof d.saldo === 'number' ? d.saldo : (Number(d.saldo) || 0);
        const isWebActive = d.isWebsiteActive !== false;

        items.push({
          id: ownerId,
          slug: slug.toLowerCase().replace(/[^a-z0-9]/g, ''),
          namaBrand,
          namaOwner: (d.namaOwner as string) || namaBrand,
          ownerId,
          ownerEmail: email,
          ownerWhatsApp: noWhatsApp,
          tier,
          status: isWebActive ? 'AKTIF' : 'SUSPENDED',
          isWebsiteActive: isWebActive,
          saldo,
          maxJadwal: tier === 'Ultimate' ? 99999 : tier === 'Pro' ? 300 : 75,
          createdAt: tanggalDaftar,
          expiredAt: tanggalLangganan,
          catatan: (d.jenisUsaha as string) || 'Studio Mandiri',
        });
      });
    } catch (e) {
      console.warn('Gagal membaca koleksi owners:', e);
    }

    // 2. Ambil juga dari 'brands_registry' jika ada
    try {
      const collRef = collection(init.db, 'brands_registry');
      const snap = await getDocs(collRef);
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        const slug = (d.slug as string) || docSnap.id;
        if (!items.some((i) => i.slug === slug || i.ownerId === d.ownerId)) {
          const saldo = typeof d.saldo === 'number' ? d.saldo : (Number(d.saldo) || 0);
          const isWebActive = d.isWebsiteActive !== false && d.status !== 'SUSPENDED';
          items.push({
            id: docSnap.id,
            slug: (d.slug as string) || docSnap.id,
            namaBrand: (d.namaBrand as string) || 'Studio Tanpa Nama',
            namaOwner: (d.namaOwner as string) || (d.namaBrand as string) || 'Owner',
            ownerId: (d.ownerId as string) || docSnap.id,
            ownerEmail: d.ownerEmail as string | undefined,
            ownerWhatsApp: d.ownerWhatsApp as string | undefined,
            customDomain: d.customDomain as string | undefined,
            tier: (d.tier as BrandRegistryItem['tier']) || 'Pro',
            status: isWebActive ? 'AKTIF' : 'SUSPENDED',
            isWebsiteActive: isWebActive,
            saldo,
            maxJadwal: typeof d.maxJadwal === 'number' ? d.maxJadwal : 300,
            createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
            expiredAt: typeof d.expiredAt === 'number' ? d.expiredAt : Date.now() + 365 * 86400000,
            catatan: d.catatan as string | undefined,
          });
        }
      });
    } catch (e) {
      console.warn('Gagal membaca brands_registry:', e);
    }

    saveLocalCachedBrands(items);
    return items;
  } catch (err) {
    console.warn('Gagal membaca dari Firestore:', err);
    return getLocalCachedBrands();
  }
}

/**
 * Mencari brand berdasarkan slug URL atau custom domain
 */
export async function fetchBrandBySlugOrDomain(
  identifier: string
): Promise<BrandRegistryItem | null> {
  const clean = identifier.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!clean) return null;

  const cached = getLocalCachedBrands();
  const directMatch = cached.find(
    (b) =>
      b.slug.toLowerCase() === clean ||
      (b.customDomain && b.customDomain.toLowerCase() === clean) ||
      (b.customDomain && b.customDomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') === clean)
  );

  const init = initKafelaFirebase();
  if (!init) return directMatch || null;

  try {
    // 1. Coba baca doc dengan id = slug
    const docRef = doc(init.db, 'brands_registry', clean);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      return {
        id: snap.id,
        slug: (d.slug as string) || snap.id,
        namaBrand: (d.namaBrand as string) || 'Studio Tanpa Nama',
        ownerId: (d.ownerId as string) || snap.id,
        ownerEmail: d.ownerEmail as string | undefined,
        ownerWhatsApp: d.ownerWhatsApp as string | undefined,
        customDomain: d.customDomain as string | undefined,
        tier: (d.tier as BrandRegistryItem['tier']) || 'Pro',
        status: (d.status as BrandRegistryItem['status']) || 'AKTIF',
        maxJadwal: typeof d.maxJadwal === 'number' ? d.maxJadwal : 300,
        createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
        expiredAt: typeof d.expiredAt === 'number' ? d.expiredAt : Date.now() + 365 * 86400000,
        catatan: d.catatan as string | undefined,
      };
    }
  } catch (err) {
    console.warn('Gagal lookup slug di Firestore:', err);
  }

  return directMatch || null;
}

function syncOwnerFieldsToWorkspaceCache(ownerUid: string, patch: Record<string, unknown>): void {
  try {
    const v5Key = `KAFELA_WORKSPACE_V5_${ownerUid || 'default'}`;
    const v5Raw = localStorage.getItem(v5Key);
    if (v5Raw) {
      const ws = JSON.parse(v5Raw);
      if (ws && ws.owner) {
        ws.owner = { ...ws.owner, ...patch };
        localStorage.setItem(v5Key, JSON.stringify(ws));
      }
    }
  } catch {}

  try {
    const v4Raw = localStorage.getItem('KAFELA_PC_WORKSPACE_CACHE_V4');
    if (v4Raw) {
      const ws = JSON.parse(v4Raw);
      if (ws && ws.owner && (ws.owner.uid === ownerUid || ws.owner.id === ownerUid)) {
        ws.owner = { ...ws.owner, ...patch };
        localStorage.setItem('KAFELA_PC_WORKSPACE_CACHE_V4', JSON.stringify(ws));
      }
    }
  } catch {}
}

export async function renewSubscriptionWithSaldo(
  ownerUid: string,
  brandSlug: string,
  tier: PaketLanggananTier,
  durationDays: number,
  price: number
): Promise<{ success: boolean; error?: string; newExpired?: number }> {
  const init = initKafelaFirebase();
  try {
    const ownerRef = init ? doc(init.db, 'owners', ownerUid) : null;
    let ownerData: OwnerProfile | null = null;

    if (init && ownerRef) {
      const snap = await getDoc(ownerRef);
      if (snap.exists()) ownerData = snap.data() as OwnerProfile;
    }

    if (!ownerData) {
      try {
        const v5Raw = localStorage.getItem(`KAFELA_WORKSPACE_V5_${ownerUid || 'default'}`);
        if (v5Raw) {
          ownerData = JSON.parse(v5Raw)?.owner || null;
        }
      } catch {}
    }

    if (!ownerData) return { success: false, error: 'Data owner tidak ditemukan' };

    const currentSaldo = ownerData.saldo || 0;
    if (currentSaldo < price) {
      return { success: false, error: `Saldo tidak mencukupi (Saldo Anda: Rp ${currentSaldo.toLocaleString()}, Diperlukan: Rp ${price.toLocaleString()})` };
    }

    const newSaldo = currentSaldo - price;
    const now = Date.now();
    const currentExpired = ownerData.tanggalLangganan || now;
    const baseTime = Math.max(currentExpired, now);
    const newExpired = baseTime + durationDays * 24 * 60 * 60 * 1000;
    const maxJadwal = tier === 'Ultimate' ? 99999 : tier === 'Pro' ? 300 : 75;

    if (init && ownerRef) {
      await updateDoc(ownerRef, {
        saldo: newSaldo,
        paketAktif: tier,
        tanggalLangganan: newExpired,
      });
    }

    if (init && brandSlug) {
      try {
        const brandRef = doc(init.db, 'brands_registry', brandSlug);
        await updateDoc(brandRef, {
          tier,
          expiredAt: newExpired,
          maxJadwal,
          status: 'AKTIF',
        });
      } catch (e) {
        console.warn('Update brand registry on renew:', e);
      }
    }

    syncOwnerFieldsToWorkspaceCache(ownerUid, {
      saldo: newSaldo,
      paketAktif: tier,
      tanggalLangganan: newExpired,
    });

    const brandsCached = JSON.parse(localStorage.getItem(LOCAL_KEY_BRANDS_REGISTRY) || '[]');
    const updatedBrands = brandsCached.map((b: any) =>
      b.ownerId === ownerUid || b.slug === brandSlug
        ? { ...b, saldo: newSaldo, tier, expiredAt: newExpired, maxJadwal, status: 'AKTIF' }
        : b
    );
    localStorage.setItem(LOCAL_KEY_BRANDS_REGISTRY, JSON.stringify(updatedBrands));

    return { success: true, newExpired };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function updateOwnerSaldo(
  ownerUid: string,
  newSaldo: number,
  brandSlug?: string
): Promise<{ success: boolean; error?: string; firestoreSaved?: boolean }> {
  const init = initKafelaFirebase();
  let firestoreSaved = false;
  let firestoreError: string | null = null;

  if (init) {
    try {
      const ownerRef = doc(init.db, 'owners', ownerUid);
      await updateDoc(ownerRef, { saldo: newSaldo });
      firestoreSaved = true;
    } catch (err: any) {
      firestoreError = err?.message || String(err);
      try {
        const ownerRef = doc(init.db, 'owners', ownerUid);
        await setDoc(ownerRef, { saldo: newSaldo }, { merge: true });
        firestoreSaved = true;
        firestoreError = null;
      } catch (e2: any) {
        firestoreError = e2?.message || firestoreError;
      }
    }

    if (brandSlug) {
      try {
        const brandRef = doc(init.db, 'brands_registry', brandSlug);
        await setDoc(brandRef, { saldo: newSaldo }, { merge: true });
        firestoreSaved = true;
      } catch (eBrand) {
        console.warn('Simpan saldo ke brands_registry:', eBrand);
      }
    }
  }

  syncOwnerFieldsToWorkspaceCache(ownerUid, { saldo: newSaldo });

  const brandsLocal = JSON.parse(localStorage.getItem(LOCAL_KEY_BRANDS_REGISTRY) || '[]');
  const updatedBrands = brandsLocal.map((b: any) =>
    b.ownerId === ownerUid || b.slug === brandSlug || b.id === ownerUid
      ? { ...b, saldo: newSaldo }
      : b
  );
  localStorage.setItem(LOCAL_KEY_BRANDS_REGISTRY, JSON.stringify(updatedBrands));

  if (firestoreError && !firestoreSaved) {
    return {
      success: false,
      error: `Izin Firestore Ditolak (Missing or insufficient permissions).\n\nPastikan Anda telah login menggunakan akun email resmi Super Admin sebelum memperbarui saldo studio.`,
    };
  }

  return { success: true, firestoreSaved };
}

export async function addOwnerSaldo(
  ownerUid: string,
  amountToAdd: number,
  brandSlug?: string
): Promise<{ success: boolean; newSaldo?: number; error?: string; firestoreSaved?: boolean }> {
  const init = initKafelaFirebase();
  let currentSaldo = 0;

  if (init) {
    try {
      const ownerRef = doc(init.db, 'owners', ownerUid);
      const snap = await getDoc(ownerRef);
      if (snap.exists()) {
        const d = snap.data();
        currentSaldo = typeof d.saldo === 'number' ? d.saldo : (Number(d.saldo) || 0);
      }
    } catch (e) {
      console.warn('Gagal membaca saldo saat ini dari Firestore:', e);
    }
  }

  if (currentSaldo === 0) {
    const brandsLocal = JSON.parse(localStorage.getItem(LOCAL_KEY_BRANDS_REGISTRY) || '[]');
    const match = brandsLocal.find((b: any) => b.ownerId === ownerUid || b.slug === brandSlug);
    if (match && typeof match.saldo === 'number') currentSaldo = match.saldo;
  }

  const newSaldo = currentSaldo + amountToAdd;
  const updateRes = await updateOwnerSaldo(ownerUid, newSaldo, brandSlug);
  return { ...updateRes, newSaldo };
}

export async function toggleWebsiteActive(
  ownerUid: string,
  brandSlug: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const init = initKafelaFirebase();
  let firestoreSaved = false;
  let firestoreError: string | null = null;

  if (init) {
    try {
      const ownerRef = doc(init.db, 'owners', ownerUid);
      await updateDoc(ownerRef, {
        isWebsiteActive: isActive,
        status: isActive ? 'AKTIF' : 'SUSPENDED',
      });
      firestoreSaved = true;
    } catch (err: any) {
      firestoreError = err?.message || String(err);
      try {
        const ownerRef = doc(init.db, 'owners', ownerUid);
        await setDoc(
          ownerRef,
          {
            isWebsiteActive: isActive,
            status: isActive ? 'AKTIF' : 'SUSPENDED',
          },
          { merge: true }
        );
        firestoreSaved = true;
        firestoreError = null;
      } catch (e2: any) {
        firestoreError = e2?.message || firestoreError;
      }
    }

    if (brandSlug) {
      try {
        const brandRef = doc(init.db, 'brands_registry', brandSlug);
        await setDoc(
          brandRef,
          {
            status: isActive ? 'AKTIF' : 'SUSPENDED',
            isWebsiteActive: isActive,
          },
          { merge: true }
        );
        firestoreSaved = true;
      } catch (eBrand) {
        console.warn('Toggle status di brands_registry:', eBrand);
      }
    }
  }

  syncOwnerFieldsToWorkspaceCache(ownerUid, { isWebsiteActive: isActive });

  const brandsLocal = JSON.parse(localStorage.getItem(LOCAL_KEY_BRANDS_REGISTRY) || '[]');
  const updatedBrands = brandsLocal.map((b: any) =>
    b.ownerId === ownerUid || b.slug === brandSlug
      ? { ...b, status: isActive ? 'AKTIF' : 'SUSPENDED', isWebsiteActive: isActive }
      : b
  );
  localStorage.setItem(LOCAL_KEY_BRANDS_REGISTRY, JSON.stringify(updatedBrands));

  if (firestoreError && !firestoreSaved) {
    return {
      success: false,
      error: `Izin Firestore Ditolak (Missing or insufficient permissions).\n\nPastikan Anda telah login menggunakan akun email resmi Super Admin sebelum mengubah status aktif website studio.`,
    };
  }

  return { success: true };
}



