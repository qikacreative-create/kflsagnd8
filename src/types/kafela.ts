export interface AttireModel {
  cpwModel?: string;
  cpwUkuran?: string;
  cppModel?: string;
  cppUkuran?: string;
  catatanAttire?: string;
}

export interface FotoTeknisModel {
  jmlShooter?: string;
  droneLighting?: string;
  namaKru?: string;
  linkDrive?: string;
}

export interface McProtokolModel {
  bahasaGaya?: string;
  dresscode?: string;
  tokohPenting?: string;
  catatanKhusus?: string;
}

export interface WoKoordinasiModel {
  jmlUndangan?: string;
  picGedung?: string;
  daftarVendor?: string;
  linkRundown?: string;
}

export interface JadwalFotografi {
  idJadwal: string;
  namaAcara: string;
  namaKlien: string;
  lokasi: string;
  paket: string;
  hargaPaketDasar: number;
  namaTambahan: string;
  hargaTambahan: number;
  namaPic: string;
  waPic: string;
  waktuMulai: number;
  waktuSelesai: number;
  tanggalMulai: number;
  tanggalSelesaiEvent: number;
  status: 'Booking' | 'DP' | 'Lunas' | 'Dibatalkan' | 'Menunggu Konfirmasi';
  hargaKotor: number;
  diskon: number;
  dpDibayar: number;
  catatan: string;
  sumber: '' | 'WEB' | 'WEB_TERKONFIRMASI' | 'KASIR_POS';
  attire?: AttireModel;
  fotoTeknis?: FotoTeknisModel;
  mcProtokol?: McProtokolModel;
  woKoordinasi?: WoKoordinasiModel;
  isFromArchive?: boolean;
  archiveDocId?: string;
}

export interface PaketLayanan {
  idPaket: string;
  namaPaket: string;
  hargaPaket: number;
  deskripsiPaket: string;
  urutan: number;
}

export interface AnggotaTimModel {
  uid: string;
  nama: string;
  username?: string;
  loginId?: string;
  noWhatsApp: string;
  password?: string;
  role: 'admin' | 'anggota';
  posisi: string;
  namaBrand: string;
  ownerParentId: string;
  tanggalDibuat: number;
}

export interface RekeningModel {
  bankUtama: string;
  rekUtama: string;
  namaUtama: string;
  bankAlternatif: string;
  rekAlternatif: string;
  namaAlternatif: string;
  linkPembayaran: string;
  catatanRekening: string;
}

export type PenempatanLogoMode = 'KEDUANYA' | 'SAMPING' | 'WATERMARK' | 'TIDAK_TAMPIL';
export type PaketLanggananTier = 'Starter' | 'Pro' | 'Ultimate';
export type UserRoleType = 'owner' | 'admin' | 'anggota';
export type BrandStatusType = 'AKTIF' | 'SUSPENDED' | 'TRIAL';

export interface BrandRegistryItem {
  id: string; // usually slug
  slug: string; // e.g. "kfls"
  namaBrand: string; // e.g. "Kafela Studio"
  ownerId: string; // Firebase UID / Document ID di /owners/{ownerId}
  ownerEmail?: string;
  ownerWhatsApp?: string;
  customDomain?: string; // e.g. "kflsagnd.web.app" or "brand.web.app" or "studioanda.com"
  namaOwner?: string;
  tier: PaketLanggananTier; // "Starter" | "Pro" | "Ultimate"
  status: BrandStatusType;
  isWebsiteActive?: boolean;
  saldo?: number;
  maxJadwal?: number;
  createdAt: number;
  expiredAt: number; // timestamp ms
  catatan?: string;
}

export type WebLayoutType =
  | 'HORIZONTAL_BOOK' // 1. Buku Editorial Majalah (Geser Samping)
  | 'VERTICAL_LANDING' // 2. Landing Page Modern (Scroll Vertikal)
  | 'CINEMATIC_SHOWCASE' // 3. Sinematik Layar Lebar 21:9 & Moodboard Gelap
  | 'GRID_MASONRY' // 4. Galeri Masonry & Moodboard Estetik
  | 'SPLIT_EDITORIAL' // 5. Split-Screen Dual-Pane Atelier
  | 'MINIMAL_LINKTREE' // 6. Bio-Link Premium & Quick Accordion
  | 'CAROUSEL_FULLSCREEN' // 7. Fullscreen Slide Imersif & Bottom Sheet
  | 'RETRO_BRUTALIST'; // 8. Neo-Brutalist & Pop Studio Modern

export interface WebProfilSekunder {
  aktif: boolean;
  subJudul?: string; // misal "Wedding & Prewedding", "Self Studio & Graduation", "Katalog Busana"
  jenisUsaha?: string;
  usernameSlug?: string;
  taglineWeb?: string;
  bioWeb?: string;
  email?: string;
  noWhatsApp?: string;
  linkIg?: string;
  linkTiktok?: string;
  linkYoutube?: string;
  linkFacebook?: string;
  temaWeb?: 'MODERN_STUDIO' | 'LUXURY_GOLD' | 'CLEAN_MINIMALIST' | 'VERTICAL_LANDING';
  layoutWeb?: WebLayoutType;
  portofolioWeb?: string[];
  portofolioCaptions?: string[];
  linkBookingKhusus?: string; // jika diisi, pakai link ini; jika kosong, pakai booking bawaan
  pesanPenutupWeb?: string;
  jamOperasionalWeb?: string;
  ctaTeksKustom?: string;
  ctaLinkKustom?: string;
}

export interface OwnerProfile {
  uid: string;
  namaOwner: string;
  namaBrand: string;
  saldo?: number;
  noWhatsApp: string;
  email?: string;
  jenisUsaha: string;
  paketAktif: PaketLanggananTier;
  tanggalDaftar: number;
  tanggalLangganan: number;
  username: string;
  taglineWeb: string;
  bioWeb?: string;
  linkIg: string;
  linkTiktok: string;
  linkYoutube?: string;
  linkFacebook?: string;
  lokasi1: string;
  lokasi2: string;
  lokasi3: string;
  logoBrandUrl: string;
  penempatanLogo: PenempatanLogoMode;
  ttdUrl: string;
  portofolioWeb: string[];
  portofolioCaptions?: string[];
  temaWeb?: 'MODERN_STUDIO' | 'LUXURY_GOLD' | 'CLEAN_MINIMALIST' | 'VERTICAL_LANDING';
  layoutWeb?: WebLayoutType;
  pesanPenutupWeb?: string;
  jamOperasionalWeb?: string;
  ctaTeksKustom?: string;
  ctaLinkKustom?: string;
  teksTombolBooking?: string;
  isWebsiteActive?: boolean;
  isBookingActive?: boolean;
  webProfil2?: WebProfilSekunder;
  templateWaTagihan: string;
  templateWaKonfirmasi: string;
  templateWaBookingWeb: string;
  warnaTema: string;
  gayaLatarNavigasi?: 'SOLID' | 'GLASS' | 'GRADIENT' | 'DARK_ACCENT';
  opasitasNavigasi?: number;
  isKacaGelap: boolean;
  opasitasOverlay: string;
  customBackgroundUrl?: string;
  customBackgroundBlur?: number;
  customBackgroundOpacity?: number;
  customBackgroundOverlayType?: 'HITAM' | 'PUTIH';
  opasitasKartu?: number;
}

export interface FirebaseCustomConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

export interface QuotaStats {
  readsSession: number;
  writesSession: number;
  cacheHitsSession: number;
  lastSyncedAt: number;
  syncMode: 'CACHE_PRO' | 'LIVE_ULTIMATE' | 'LOCKED_STARTER';
  isIdlePaused: boolean;
  isLiveListenerActive?: boolean;
}

export const DAFTAR_JENIS_USAHA = [
  'Fotografi & Studio Foto',
  'Make Up Artist (MUA)',
  'Wedding Organizer (WO)',
  'Master of Ceremony (MC)',
  'Videografi & Sinematografi',
  'Sewa Pakaian & Gaun',
  'Dekorasi & Tenda',
  'Sound System & Musik',
  'Umum / Standar',
];

export interface PelangganModel {
  idPelanggan: string;
  nama: string;
  noWhatsApp: string;
  catatan?: string;
  createdAt: number;
}
