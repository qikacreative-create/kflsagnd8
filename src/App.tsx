import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  Bell,
  Building2,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Edit3,
  Globe,
  Layers,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Palette,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Sliders,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import {
  AnggotaTimModel,
  BrandRegistryItem,
  JadwalFotografi,
  OwnerProfile,
  PaketLanggananTier,
  PaketLayanan,
  PelangganModel,
  QuotaStats,
  RekeningModel,
  UserRoleType,
} from './types/kafela';
import {
  ProfessionPresetKey,
  generateDemoWorkspace,
} from './services/demoDataSeeder';
import { getLimits } from './utils/subscription';
import {
  bangunPesanWA,
  bersihkanTitik,
  formatHariTanggalIndo,
  formatJamWIB,
  formatNomorWA,
  formatRibuanInput,
  formatTanggalIndo,
  keRupiah,
} from './utils/formatters';
import {
  compressOldSchedulesToFirebase,
  deleteJadwalFromFirebase,
  deletePaketFromFirebase,
  deletePelangganFromFirebase,
  deleteTimFromFirebase,
  fetchBrandBySlugOrDomain,
  fetchOwnerWorkspaceFromFirebase,
  listenFirebaseAuthState,
  logoutFirebaseSession,
  restoreArsipToFirebase,
  saveJadwalToFirebase,
  saveOwnerProfileToFirebase,
  savePaketToFirebase,
  savePelangganToFirebase,
  saveRekeningToFirebase,
  saveTimToFirebase,
  subscribeLiveJadwalUltimate,
} from './services/firebaseClient';
import {
  OfflineIndicator,
  PWAInstallButton,
  PWAInstallFloatingBanner,
} from './hooks/usePWAInstall';
import { LoginAndSetupScreen } from './components/LoginAndSetupScreen';
import type { PengaturanSubTab } from './components/ManagementViews';

const StrukModal = lazy(() =>
  import('./components/StrukModal').then((m) => ({ default: m.StrukModal }))
);
const SignatureAndLogoModal = lazy(() =>
  import('./components/SignatureAndLogoModal').then((m) => ({ default: m.SignatureAndLogoModal }))
);
const ScheduleAndCashierForm = lazy(() =>
  import('./components/ScheduleAndCashierForm').then((m) => ({ default: m.ScheduleAndCashierForm }))
);
const SuperAdminDashboard = lazy(() =>
  import('./components/SuperAdminDashboard').then((m) => ({ default: m.SuperAdminDashboard }))
);
const SubscriptionExpiredScreen = lazy(() =>
  import('./components/SubscriptionExpiredScreen').then((m) => ({
    default: m.SubscriptionExpiredScreen,
  }))
);
const TopUpModal = lazy(() =>
  import('./components/TopUpModal').then((m) => ({ default: m.TopUpModal }))
);
const LaporanKeuanganView = lazy(() =>
  import('./components/ManagementViews').then((m) => ({ default: m.LaporanKeuanganView }))
);
const ArsipPencarianView = lazy(() =>
  import('./components/ManagementViews').then((m) => ({ default: m.ArsipPencarianView }))
);
const MasterPaketView = lazy(() =>
  import('./components/ManagementViews').then((m) => ({ default: m.MasterPaketView }))
);
const DaftarPelangganView = lazy(() =>
  import('./components/ManagementViews').then((m) => ({ default: m.DaftarPelangganView }))
);
const KelolaTimView = lazy(() =>
  import('./components/ManagementViews').then((m) => ({ default: m.KelolaTimView }))
);
const PengaturanStudioView = lazy(() =>
  import('./components/ManagementViews').then((m) => ({ default: m.PengaturanStudioView }))
);


type ActiveNavTab =
  | 'KALENDER'
  | 'LAPORAN'
  | 'ARSIP'
  | 'PAKET'
  | 'TIM'
  | 'PELANGGAN'
  | 'PENGATURAN';

const SESSION_META_KEY = 'KAFELA_SESSION_META_V5';
const getWorkspaceCacheKey = (ownerId: string) => `KAFELA_WORKSPACE_V5_${ownerId || 'default'}`;
const LEGACY_CACHE_KEY = 'KAFELA_PC_WORKSPACE_CACHE_V4';

function loadInitialWorkspaceCache() {
  try {
    const metaRaw = localStorage.getItem(SESSION_META_KEY);
    const legacyRaw = localStorage.getItem(LEGACY_CACHE_KEY);
    let meta: any = null;
    if (metaRaw) {
      meta = JSON.parse(metaRaw);
    } else if (legacyRaw) {
      meta = JSON.parse(legacyRaw);
    }

    if (meta && (meta.sessionMode === 'FIREBASE' || meta.sessionMode === 'DEMO')) {
      const targetId = meta.targetOwnerId;
      const wsRaw = targetId ? localStorage.getItem(getWorkspaceCacheKey(targetId)) : null;
      const ws = wsRaw ? JSON.parse(wsRaw) : (legacyRaw ? JSON.parse(legacyRaw) : null);
      return { meta, ws };
    }
  } catch {}
  return null;
}

const DAFTAR_WARNA_TEMA_APK = [
  // 1. Klasik & Paling Seimbang (Andalan Utama)
  { nama: 'Slate Elegan (Default)', kode: '#2C3E50' },
  { nama: 'Midnight Vercel', kode: '#0F172A' },
  { nama: 'Titanium Steel', kode: '#334155' },
  { nama: 'Carbon Gray Modern', kode: '#212529' },

  // 2. Nuansa Biru Eksklusif (Professional & Trust)
  { nama: 'Royal Sapphire', kode: '#1D4ED8' },
  { nama: 'Deep Ocean Blue', kode: '#0369A1' },
  { nama: 'Indigo Midnight', kode: '#312E81' },
  { nama: 'Cyber Navy', kode: '#1E3A8A' },

  // 3. Nuansa Hijau & Teal Mewah (Fresh & Studio Vibe)
  { nama: 'Emerald Studio Luxe', kode: '#065F46' },
  { nama: 'Forest Pine Rich', kode: '#064E3B' },

  // 4. Nuansa Ungu & Magenta Aesthetic (Creative & Classy)
  { nama: 'Royal Amethyst', kode: '#4C1D95' },
  { nama: 'Cosmic Violet', kode: '#3B0764' },
  { nama: 'Burgundy Wine Rich', kode: '#641E16' },

  // 5. Nuansa Hangat / Warm (Coffee, Bronze & Earthy)
  { nama: 'Espresso Kopi Mewah', kode: '#4E342E' },
  { nama: 'Terracotta Bakar', kode: '#9A3412' },
  { nama: 'Golden Amber Dark', kode: '#78350F' },
];


export default function App() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Muat cache workspace awal yang terisolasi per owner
  const initialCache = useMemo(() => loadInitialWorkspaceCache(), []);
  const initialDemo = useMemo(() => generateDemoWorkspace('FOTO'), []);

  // Mode Sesi: dipulihkan otomatis dari LocalStorage agar saat Reload tidak terlempar ke Login
  const [sessionMode, setSessionMode] = useState<'DEMO' | 'FIREBASE' | null>(() => {
    return initialCache?.meta?.sessionMode || null;
  });

  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [pengaturanSubTab, setPengaturanSubTab] = useState<PengaturanSubTab>(() => {
    try {
      const saved = sessionStorage.getItem('KAFELA_SUB_TAB') as PengaturanSubTab | null;
      if (saved) return saved;
    } catch {}
    return 'PROFIL';
  });

  // Mode Tampilan: Selalu default ke Kasir Studio (Akses Super Admin hanya rahasia via 5x ketuk teks versi v.4.16)
  const [viewMode, setViewMode] = useState<'CASHIER' | 'SUPER_ADMIN'>('CASHIER');

  const [activeBrandSlug, setActiveBrandSlug] = useState<string>(() => {
    if (typeof window === 'undefined') return 'kfls';
    const params = new URLSearchParams(window.location.search);
    const querySlug = params.get('brand') || params.get('b');
    if (querySlug) return querySlug;

    const host = window.location.hostname.toLowerCase();
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.includes('.run.app');
    if (!isLocal && (host.includes('.web.app') || host.includes('.firebaseapp.com'))) {
      const sub = host.split('.')[0];
      if (sub && sub !== 'kflsagnd' && sub !== 'kafilasuci3' && sub !== 'kafilasuci4') {
        return sub;
      }
    }
    return 'kfls';
  });

  const [targetOwnerId, setTargetOwnerId] = useState<string>(() => {
    return initialCache?.meta?.targetOwnerId || 'demo-owner-kafela-001';
  });

  const [userRole, setUserRole] = useState<UserRoleType>(() => {
    return initialCache?.meta?.userRole || 'owner';
  });
  const [activeUserName, setActiveUserName] = useState<string>(() => {
    const saved = initialCache?.meta?.activeUserName;
    return saved ? (saved === 'Owner ' ? 'Owner' : saved) : 'Iqbal Saefinnuha';
  });
  const [activeUserEmail, setActiveUserEmail] = useState<string>(() => {
    return initialCache?.meta?.activeUserEmail || '';
  });

  // Data Utama Workspace (Disimpan di RAM + LocalStorage Cache terisolasi per ID Studio)
  const [owner, setOwner] = useState<OwnerProfile>(() => {
    return initialCache?.ws?.owner || initialDemo.owner;
  });
  const [rekening, setRekening] = useState<RekeningModel>(() => {
    return initialCache?.ws?.rekening || initialDemo.rekening;
  });
  const [paketList, setPaketList] = useState<PaketLayanan[]>(() => {
    return initialCache?.ws?.paketList || initialDemo.paketList;
  });
  const [jadwalAktif, setJadwalAktif] = useState<JadwalFotografi[]>(() => {
    if (initialCache?.ws?.sessionMode === 'DEMO' && Array.isArray(initialCache.ws.jadwalAktif) && initialCache.ws.jadwalAktif.length < 8) {
      return initialDemo.jadwalAktif;
    }
    return initialCache?.ws?.jadwalAktif || initialDemo.jadwalAktif;
  });
  const [jadwalArsip, setJadwalArsip] = useState<JadwalFotografi[]>(() => {
    return initialCache?.ws?.jadwalArsip || initialDemo.jadwalArsip;
  });
  const [timList, setTimList] = useState<AnggotaTimModel[]>(() => {
    return initialCache?.ws?.timList || initialDemo.timList;
  });
  const [pelangganList, setPelangganList] = useState<PelangganModel[]>(() => {
    return initialCache?.ws?.pelangganList || initialDemo.pelangganList || [];
  });

  // Statistik Anti-Boncos
  const [quotaStats, setQuotaStats] = useState<QuotaStats>({
    readsSession: 1,
    writesSession: 0,
    cacheHitsSession: 8,
    lastSyncedAt: Date.now(),
    syncMode: 'CACHE_PRO',
    isLiveListenerActive: false,
    isIdlePaused: false,
  });

  // Navigasi & Drawer APK + Ingat Menu Terakhir saat Reload
  const [activeTab, setActiveTab] = useState<ActiveNavTab>(() => {
    try {
      const saved = sessionStorage.getItem('KAFELA_ACTIVE_TAB') as ActiveNavTab | null;
      if (saved) return saved;
    } catch {}
    return 'KALENDER';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [isPaketExpanded, setIsPaketExpanded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isReadOnlyBypass, setIsReadOnlyBypass] = useState(false);
  const [isTestExpiredActive, setIsTestExpiredActive] = useState(false);
  const [isTopUpGlobalOpen, setIsTopUpGlobalOpen] = useState(false);


  useEffect(() => {
    try {
      sessionStorage.setItem('KAFELA_ACTIVE_TAB', activeTab);
      sessionStorage.setItem('KAFELA_SUB_TAB', pengaturanSubTab);
    } catch {}
  }, [activeTab, pengaturanSubTab]);

  // Resolusi brand otomatis & proteksi halaman profil publik
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;
    const isLocal =
      import.meta.env.DEV ||
      port !== '' ||
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.') ||
      host.includes('.run.app') ||
      host.endsWith('.local');

    let sub = '';
    if (!isLocal) {
      if (host.includes('.web.app')) {
        sub = host.split('.web.app')[0].split('.').pop() || '';
      } else if (host.includes('.firebaseapp.com')) {
        sub = host.split('.firebaseapp.com')[0].split('.').pop() || '';
      } else if (host !== 'kflsagnd.web.app' && host !== 'kafilasuci4.web.app' && host !== 'kafilasuci3.web.app') {
        sub = host.replace(/^www\./, '');
      }
    }

    // Jika pengunjung membuka domain khusus brand (bukan portal kflsagnd) tanpa rute /app atau parameter app=1,
    // langsung alihkan ke Web Profil Brand agar pengunjung tidak melihat formulir login kasir!
    const isKasirExplicit =
      path === 'app' ||
      path.endsWith('/app') ||
      path.includes('/app') ||
      params.get('app') === '1' ||
      params.get('mode') === 'super-admin' ||
      params.get('super_admin') === '1';

    if (sub && sub !== 'kflsagnd' && sub !== 'kafilasuci4' && sub !== 'kafilasuci3' && !isKasirExplicit) {
      const search = window.location.search || '';
      window.location.replace(`/profil.html?id=${encodeURIComponent(sub)}${search ? '&' + search.replace(/^\?/, '') : ''}`);
      return;
    }

    let slugCandidate = params.get('brand') || params.get('b');
    if (!slugCandidate && path && path.includes('/app')) {
      const parts = path.split('/');
      if (parts.length > 1 && parts[0] !== 'app') {
        slugCandidate = parts[0];
      }
    }
    if (!slugCandidate && sub && sub !== 'kflsagnd' && sub !== 'kafilasuci4' && sub !== 'kafilasuci3') {
      slugCandidate = sub;
    }

    if (slugCandidate) {
      setActiveBrandSlug(slugCandidate);
      fetchBrandBySlugOrDomain(slugCandidate).then((found) => {
        if (found) {
          setTargetOwnerId(found.ownerId);
          setOwner((prev) => ({
            ...prev,
            namaBrand: found.namaBrand,
            username: found.slug,
            paketAktif: found.tier,
            noWhatsApp: found.ownerWhatsApp || prev.noWhatsApp,
          }));
        }
      });
    }
  }, []);

  const handleSelectBrandForCashier = async (brand: BrandRegistryItem) => {
    setActiveBrandSlug(brand.slug);
    setTargetOwnerId(brand.ownerId);
    setOwner((prev) => ({
      ...prev,
      namaBrand: brand.namaBrand,
      username: brand.slug,
      paketAktif: brand.tier,
      noWhatsApp: brand.ownerWhatsApp || prev.noWhatsApp,
    }));
    if (!sessionMode) {
      setSessionMode('DEMO');
    } else if (sessionMode === 'FIREBASE') {
      try {
        const remote = await fetchOwnerWorkspaceFromFirebase(brand.ownerId);
        if (remote && remote.owner) {
          setOwner(remote.owner);
          setPaketList(remote.paketList || []);
          setJadwalAktif(remote.jadwalAktif || []);
          setJadwalArsip(remote.jadwalArsip || []);
          setRekening(remote.rekening || initialDemo.rekening);
          setTimList(remote.timList || []);
          setPelangganList(remote.pelangganList || []);
        }
      } catch (e) {
        console.warn('Gagal memuat workspace brand:', e);
      }
    }
    setViewMode('CASHIER');
  };

  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 860;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileLayout(window.innerWidth < 860);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // State Kalender & Pencarian (Awal pertama buka: tampilkan jadwal di hari ini saja)
  const getTodayDateKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
  };

  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(() => getTodayDateKey());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<
    | 'TANGGAL_DIPILIH'
    | 'SEMUA_BULAN'
    | 'BELUM_LUNAS'
    | 'SUDAH_DP'
    | 'BOOKING_BARU'
    | 'LUNAS'
    | 'BOOKING_WEB'
  >('TANGGAL_DIPILIH');

  // Ref & State untuk fitur Geser Kalender (Swipe Jari HP + Drag Mouse PC + Efek Geser Visual)
  const calendarTouchStartX = useRef<number | null>(null);
  const calendarTouchStartY = useRef<number | null>(null);
  const isCalendarDragging = useRef<boolean>(false);
  const [calendarDragOffset, setCalendarDragOffset] = useState<number>(0);
 
  const handleCalendarSwipeStart = (clientX: number, clientY: number) => {
    calendarTouchStartX.current = clientX;
    calendarTouchStartY.current = clientY;
    isCalendarDragging.current = true;
  };

  const handleCalendarSwipeMove = (clientX: number, clientY: number) => {
    if (
      !isCalendarDragging.current ||
      calendarTouchStartX.current === null ||
      calendarTouchStartY.current === null
    ) {
      return;
    }
    const deltaX = clientX - calendarTouchStartX.current;
    const deltaY = clientY - calendarTouchStartY.current;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      const clamped = Math.max(-75, Math.min(75, deltaX * 0.55));
      setCalendarDragOffset(clamped);
    }
  };

  const handleCalendarSwipeEnd = (clientX: number, clientY: number) => {
    if (
      !isCalendarDragging.current ||
      calendarTouchStartX.current === null ||
      calendarTouchStartY.current === null
    ) {
      setCalendarDragOffset(0);
      return;
    }
    const deltaX = clientX - calendarTouchStartX.current;
    const deltaY = clientY - calendarTouchStartY.current;
    calendarTouchStartX.current = null;
    calendarTouchStartY.current = null;
    isCalendarDragging.current = false;
    setCalendarDragOffset(0);

    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // Geser ke kiri -> Bulan berikutnya
        setCurrentCalendarDate(
          new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1)
        );
      } else {
        // Geser ke kanan -> Bulan sebelumnya
        setCurrentCalendarDate(
          new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1)
        );
      }
    }
  };

  const formatJudulTanggalPilihan = (dateStr: string | null) => {
    if (statusFilter === 'BOOKING_WEB') {
      return `Booking Web (${listPesananWebMenunggu.length} Item)`;
    }
    if (statusFilter === 'TANGGAL_DIPILIH' && dateStr) {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
          });
        }
      }
      return dateStr;
    }
    return currentCalendarDate.toLocaleDateString('id-ID', {
      month: 'long',
    });
  };

  // State Modal & Popup persis APK (dialog_aksi_jadwal.xml, dialog_struk.xml, dialog_input_dp.xml, dll)
  const [aksiJadwalTarget, setAksiJadwalTarget] = useState<JadwalFotografi | null>(null);
  const [waChoiceTarget, setWaChoiceTarget] = useState<JadwalFotografi | null>(null);
  const [strukModalJadwal, setStrukModalJadwal] = useState<JadwalFotografi | null>(null);
  const [dpModalTarget, setDpModalTarget] = useState<JadwalFotografi | null>(null);
  const [dpModalInputStr, setDpModalInputStr] = useState<string>('');
  const [fabChoiceOpen, setFabChoiceOpen] = useState(false);
  const [formModalMode, setFormModalMode] = useState<
    'KASIR_CEPAT' | 'TAMBAH_AGENDA' | 'EDIT_JADWAL' | null
  >(null);
  const [editingJadwal, setEditingJadwal] = useState<JadwalFotografi | null>(null);
  const [webInboxModalOpen, setWebInboxModalOpen] = useState(false);
  const [webConfirmTarget, setWebConfirmTarget] = useState<JadwalFotografi | null>(null);
  const [webConfirmDpStr, setWebConfirmDpStr] = useState<string>('');
  const [webConfirmExtraName, setWebConfirmExtraName] = useState<string>('');
  const [webConfirmExtraStr, setWebConfirmExtraStr] = useState<string>('');
  const [temaModalOpen, setTemaModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [langgananModalOpen, setLanggananModalOpen] = useState(false);
  const [durasiPerpanjang, setDurasiPerpanjang] = useState<'BULANAN' | 'TAHUNAN'>('BULANAN');
  const [pilihanPaketTarget, setPilihanPaketTarget] = useState<PaketLanggananTier>(owner.paketAktif || 'Pro');
  const bgFileInputRef = useRef<HTMLInputElement | null>(null);

  const ADMIN_WA_PHONE = '6283132304649';

  const handleChatAdminPerpanjang = (paketTier?: PaketLanggananTier) => {
    const paketFinal = paketTier || pilihanPaketTarget || owner.paketAktif;
    const durasiStr = durasiPerpanjang === 'TAHUNAN' ? '1 Tahun (Tahunan)' : '1 Bulan (Bulanan)';
    const pesan = `Halo Admin Kafela's Agenda, saya *${owner.namaOwner || owner.namaBrand}* dari *${owner.namaBrand}* (Username: ${owner.username || '-'}). Saya ingin melakukan Perpanjangan / Upgrade Paket ke *Paket ${paketFinal} (${durasiStr})*. Sisa masa aktif saya saat ini: ${sisaHariLangganan} Hari. Mohon info nomor rekening dan petunjuk aktivasinya. Terima kasih!`;
    const cleanPhone = ADMIN_WA_PHONE.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(pesan)}`;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setToastMessage('Mohon pilih file foto (JPG, PNG, WebP)');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const updates = {
            customBackgroundUrl: dataUrl,
            customBackgroundBlur: typeof owner.customBackgroundBlur === 'number' ? owner.customBackgroundBlur : 8,
            customBackgroundOpacity: typeof owner.customBackgroundOpacity === 'number' ? owner.customBackgroundOpacity : 60,
            customBackgroundOverlayType: owner.customBackgroundOverlayType || ('HITAM' as const),
          };
          setOwner((prev) => ({ ...prev, ...updates }));
          if (sessionMode === 'FIREBASE') {
            saveOwnerProfileToFirebase(targetOwnerId, updates).catch(console.error);
          }
          setToastMessage('Foto background berhasil dipasang!');
          setTimeout(() => setToastMessage(null), 3000);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Deteksi otomatis sesi login aktif pada Firebase + Splash Screen Penahan Reload
  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setIsAuthChecking(false);
    }, 550);

    const unsub = listenFirebaseAuthState((fbSession) => {
      if (fbSession) {
        handleLoginFirebaseSuccess(fbSession, true);
      } else {
        // Jika tidak ada sesi Firebase Auth aktif dan mode sebelumnya FIREBASE, kembalikan ke layar login
        setSessionMode((prev) => (prev === 'FIREBASE' ? null : prev));
      }
      setIsAuthChecking(false);
    });
    return () => {
      clearTimeout(splashTimer);
      unsub();
    };
  }, []);

  // Penanganan Tombol Kembali (Back Button HP / Browser):
  // 1. Jika ada popup/modal terbuka: tutup popup
  // 2. Jika di menu lain: tekan 1x kembali ke Kalender
  // 3. Jika sudah di Kalender: tekan 2x dalam 2 detik untuk keluar
  const lastBackPressTimeRef = useRef<number>(0);

  useEffect(() => {
    // Sisipkan history state agar tombol kembali browser/Android terdeteksi
    try {
      window.history.pushState({ app: 'kafela' }, '');
    } catch {}

    const handlePopState = () => {
      // Selalu pushState kembali agar tidak terlempar langsung
      try {
        window.history.pushState({ app: 'kafela' }, '');
      } catch {}

      // A. Jika ada modal / menu popup terbuka, tutup terlebih dahulu
      if (drawerOpen) {
        setDrawerOpen(false);
        return;
      }
      if (temaModalOpen) {
        setTemaModalOpen(false);
        return;
      }
      if (langgananModalOpen) {
        setLanggananModalOpen(false);
        return;
      }
      if (dpModalTarget) {
        setDpModalTarget(null);
        return;
      }
      if (aksiJadwalTarget) {
        setAksiJadwalTarget(null);
        return;
      }
      if (waChoiceTarget) {
        setWaChoiceTarget(null);
        return;
      }
      if (strukModalJadwal) {
        setStrukModalJadwal(null);
        return;
      }
      if (formModalMode) {
        setFormModalMode(null);
        return;
      }
      if (signatureModalOpen) {
        setSignatureModalOpen(false);
        return;
      }
      if (webInboxModalOpen) {
        setWebInboxModalOpen(false);
        return;
      }
      if (webConfirmTarget) {
        setWebConfirmTarget(null);
        return;
      }
      if (fabChoiceOpen) {
        setFabChoiceOpen(false);
        return;
      }

      // B. Jika sedang berada di menu selain KALENDER, tekan 1x kembali ke KALENDER
      if (activeTab !== 'KALENDER') {
        setActiveTab('KALENDER');
        return;
      }

      // C. Jika sudah di KALENDER: tekan 2x dalam 2 detik untuk keluar
      const now = Date.now();
      if (now - lastBackPressTimeRef.current < 2000) {
        setToastMessage('Keluar dari aplikasi...');
        setTimeout(() => {
          try {
            window.history.go(-2);
          } catch {}
        }, 300);
      } else {
        lastBackPressTimeRef.current = now;
        setToastMessage('Tekan sekali lagi untuk keluar dari aplikasi');
        setTimeout(() => {
          setToastMessage((prev) =>
            prev === 'Tekan sekali lagi untuk keluar dari aplikasi' ? null : prev
          );
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    activeTab,
    drawerOpen,
    temaModalOpen,
    langgananModalOpen,
    dpModalTarget,
    aksiJadwalTarget,
    waChoiceTarget,
    strukModalJadwal,
    formModalMode,
    signatureModalOpen,
    webInboxModalOpen,
    webConfirmTarget,
    fabChoiceOpen,
  ]);

  // Simpan otomatis ke LocalStorage Cache PC terisolasi per owner dengan proteksi anti-race condition
  useEffect(() => {
    if (!sessionMode || !targetOwnerId) return;

    // RACE CONDITION GUARD:
    // Pastikan owner di state memang milik targetOwnerId sebelum menyimpan ke cache!
    // Jika user baru login dan state owner masih milik studio sebelumnya, batalkan penyimpanan.
    if (sessionMode === 'FIREBASE' && owner.uid && owner.uid !== targetOwnerId) {
      return;
    }

    try {
      const targetCacheKey = getWorkspaceCacheKey(targetOwnerId);
      const existingRaw = localStorage.getItem(targetCacheKey);
      const existingCachedAt = existingRaw ? JSON.parse(existingRaw).cachedAt || Date.now() : Date.now();
      localStorage.setItem(
        targetCacheKey,
        JSON.stringify({
          sessionMode,
          targetOwnerId,
          userRole,
          activeUserName,
          activeUserEmail,
          cachedAt: existingCachedAt,
          owner,
          rekening,
          paketList,
          jadwalAktif,
          jadwalArsip,
          timList,
          pelangganList,
        })
      );
      localStorage.setItem(
        SESSION_META_KEY,
        JSON.stringify({
          sessionMode,
          targetOwnerId,
          userRole,
          activeUserName,
          activeUserEmail,
        })
      );
    } catch {}
  }, [sessionMode, targetOwnerId, userRole, activeUserName, activeUserEmail, owner, rekening, paketList, jadwalAktif, jadwalArsip, timList, pelangganList]);

  // Live Sync Otomatis khusus Paket Ultimate (pada mode Firebase Asli)
  useEffect(() => {
    if (
      isAuthChecking ||
      sessionMode !== 'FIREBASE' ||
      owner.paketAktif !== 'Ultimate' ||
      quotaStats.isIdlePaused
    ) {
      return;
    }
    const unsub = subscribeLiveJadwalUltimate(
      targetOwnerId,
      (liveList, readDelta) => {
        setJadwalAktif(liveList);
        setQuotaStats((prev) => ({
          ...prev,
          readsSession: prev.readsSession + readDelta,
          lastSyncedAt: Date.now(),
        }));
      },
      (err) => {
        console.warn('Live sync snapshot listener error:', err.message);
      }
    );
    return () => {
      if (unsub) unsub();
    };
  }, [isAuthChecking, sessionMode, owner.paketAktif, targetOwnerId, quotaStats.isIdlePaused]);

  const bumpCacheHit = () => {
    setQuotaStats((prev) => ({
      ...prev,
      cacheHitsSession: prev.cacheHitsSession + 1,
    }));
  };

  // Start Mode Simulasi
  const handleStartDemo = (preset: ProfessionPresetKey) => {
    const seeded = generateDemoWorkspace(preset);
    setOwner(seeded.owner);
    setRekening(seeded.rekening);
    setPaketList(seeded.paketList);
    setJadwalAktif(seeded.jadwalAktif);
    setJadwalArsip(seeded.jadwalArsip);
    setTimList(seeded.timList);
    setPelangganList(seeded.pelangganList || []);
    setTargetOwnerId(seeded.owner.uid);
    setUserRole('owner');
    setActiveUserName(seeded.owner.namaOwner);
    setActiveTab('KALENDER');
    setSelectedDateStr(null);
    setStatusFilter('SEMUA_BULAN');
    setSessionMode('DEMO');

    // Simpan data workspace demo ke LocalStorage & SessionStorage agar web profil demo & reload berfungsi optimal
    try {
      const demoCacheKey = getWorkspaceCacheKey(seeded.owner.uid);
      localStorage.setItem(
        demoCacheKey,
        JSON.stringify({
          sessionMode: 'DEMO',
          targetOwnerId: seeded.owner.uid,
          userRole: 'owner',
          activeUserName: seeded.owner.namaOwner,
          cachedAt: Date.now(),
          owner: seeded.owner,
          rekening: seeded.rekening,
          paketList: seeded.paketList,
          jadwalAktif: seeded.jadwalAktif,
          jadwalArsip: seeded.jadwalArsip,
          timList: seeded.timList,
          pelangganList: seeded.pelangganList || [],
        })
      );
      localStorage.setItem(
        SESSION_META_KEY,
        JSON.stringify({
          sessionMode: 'DEMO',
          targetOwnerId: seeded.owner.uid,
          userRole: 'owner',
          activeUserName: seeded.owner.namaOwner,
          activeUserEmail: '',
        })
      );
      const demoProfilePayload = JSON.stringify({
        ...seeded.owner,
        paketList: seeded.paketList,
        ownerUid: seeded.owner.uid,
      });
      sessionStorage.setItem('demo_profile_data', demoProfilePayload);
      sessionStorage.setItem('current_owner_preview_draft', demoProfilePayload);
    } catch {}

    setQuotaStats({
      readsSession: 0,
      writesSession: 0,
      cacheHitsSession: 10,
      lastSyncedAt: Date.now(),
      syncMode: 'CACHE_PRO',
      isLiveListenerActive: false,
      isIdlePaused: false,
    });
    setToastMessage(`✓ Mode Demo Aktif: ${seeded.owner.namaBrand}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Jika sedang dalam Mode Demo namun data lokal lama hanya memiliki < 8 jadwal, segarkan otomatis ke 9-10 jadwal
  useEffect(() => {
    if (sessionMode === 'DEMO' && jadwalAktif.length < 8) {
      const preset: ProfessionPresetKey =
        owner.jenisUsaha.includes('MUA')
          ? 'MUA'
          : owner.jenisUsaha.includes('Wedding Organizer')
          ? 'WO'
          : owner.jenisUsaha.includes('Master of Ceremony')
          ? 'MC'
          : 'FOTO';
      const refreshed = generateDemoWorkspace(preset);
      setJadwalAktif(refreshed.jadwalAktif);
      setPaketList(refreshed.paketList);
    }
  }, [sessionMode, jadwalAktif.length, owner.jenisUsaha]);

  const handleExitDemo = () => {
    try {
      localStorage.removeItem(SESSION_META_KEY);
      localStorage.removeItem(getWorkspaceCacheKey(targetOwnerId));
      localStorage.removeItem(LEGACY_CACHE_KEY);
      sessionStorage.removeItem('demo_profile_data');
      sessionStorage.removeItem('current_owner_preview_draft');
    } catch {}
    setJadwalAktif([]);
    setJadwalArsip([]);
    setPaketList([]);
    setTimList([]);
    setPelangganList([]);
    setSessionMode(null);
    setToastMessage('Keluar dari Mode Demo');
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Start Mode Firebase Asli (dengan Smart Cache 0-Read saat Reload dan isolasi per-owner)
  const handleLoginFirebaseSuccess = async (
    fbSession: {
      uid: string;
      targetOwnerId: string;
      role: UserRoleType;
      displayName: string;
      email?: string | null;
    },
    isAutoReload = false
  ) => {
    const isSwitchingOwner = targetOwnerId !== fbSession.targetOwnerId;
    let existingTargetCache: any = null;
    try {
      const rawTargetCache = localStorage.getItem(getWorkspaceCacheKey(fbSession.targetOwnerId));
      if (rawTargetCache) {
        existingTargetCache = JSON.parse(rawTargetCache);
      }
    } catch {}

    // Jika berganti akun owner di HP/PC yang sama, segera reset state lama agar tidak ada kebocoran visual data
    if (isSwitchingOwner) {
      if (existingTargetCache && existingTargetCache.owner) {
        setOwner(existingTargetCache.owner);
        setRekening(existingTargetCache.rekening || initialDemo.rekening);
        setPaketList(existingTargetCache.paketList || []);
        setJadwalAktif(existingTargetCache.jadwalAktif || []);
        setJadwalArsip(existingTargetCache.jadwalArsip || []);
        setTimList(existingTargetCache.timList || []);
        setPelangganList(existingTargetCache.pelangganList || []);
      } else {
        setOwner({
          ...initialDemo.owner,
          uid: fbSession.targetOwnerId,
          namaBrand: 'Memuat Studio...',
          namaOwner: fbSession.displayName,
        });
        setJadwalAktif([]);
        setJadwalArsip([]);
        setPaketList([]);
        setTimList([]);
        setPelangganList([]);
      }
    }

    setTargetOwnerId(fbSession.targetOwnerId);
    setUserRole(fbSession.role);
    setActiveUserName(fbSession.displayName);
    setActiveUserEmail(fbSession.email || '');
    setSessionMode('FIREBASE');

    // Pastikan selalu masuk ke Kasir Studio secara normal (Akses Super Admin HANYA via 5x ketuk teks versi v.4.16)
    setViewMode('CASHIER');

    // Jika ini hanya Reload Halaman (F5) dan Cache lokal untuk Owner ini masih segar (< 5 menit),
    // gunakan langsung Cache lokal (0 Read ke server!) agar super hemat kuota dan instan!
    if (isAutoReload && existingTargetCache) {
      const ageMs = Date.now() - Number(existingTargetCache.cachedAt || 0);
      if (
        existingTargetCache.targetOwnerId === fbSession.targetOwnerId &&
        existingTargetCache.owner &&
        ageMs >= 0 &&
        ageMs < 5 * 60 * 1000
      ) {
        setOwner(existingTargetCache.owner);
        setRekening(existingTargetCache.rekening || initialDemo.rekening);
        setPaketList(existingTargetCache.paketList || []);
        setJadwalAktif(existingTargetCache.jadwalAktif || []);
        setJadwalArsip(existingTargetCache.jadwalArsip || []);
        setTimList(existingTargetCache.timList || []);
        setPelangganList(existingTargetCache.pelangganList || []);
        setQuotaStats((prev) => ({
          ...prev,
          readsSession: 0,
          cacheHitsSession: prev.cacheHitsSession + 1,
          isLiveListenerActive: existingTargetCache.owner.paketAktif === 'Ultimate',
        }));
        return;
      }
    }

    try {
      const workspace = await fetchOwnerWorkspaceFromFirebase(fbSession.targetOwnerId);
      setOwner(workspace.owner);
      setRekening(workspace.rekening);
      setPaketList(workspace.paketList);
      setJadwalAktif(workspace.jadwalAktif);
      setJadwalArsip(workspace.jadwalArsip);
      setTimList(workspace.timList);
      setPelangganList(workspace.pelangganList || []);

      const targetCacheKey = getWorkspaceCacheKey(fbSession.targetOwnerId);
      try {
        localStorage.setItem(
          targetCacheKey,
          JSON.stringify({
            sessionMode: 'FIREBASE',
            targetOwnerId: fbSession.targetOwnerId,
            userRole: fbSession.role,
            activeUserName: fbSession.displayName,
            cachedAt: Date.now(),
            owner: workspace.owner,
            rekening: workspace.rekening,
            paketList: workspace.paketList,
            jadwalAktif: workspace.jadwalAktif,
            jadwalArsip: workspace.jadwalArsip,
            timList: workspace.timList,
            pelangganList: workspace.pelangganList || [],
          })
        );
        localStorage.setItem(
          SESSION_META_KEY,
          JSON.stringify({
            sessionMode: 'FIREBASE',
            targetOwnerId: fbSession.targetOwnerId,
            userRole: fbSession.role,
            activeUserName: fbSession.displayName,
            activeUserEmail: fbSession.email || '',
          })
        );
      } catch {}
      setQuotaStats({
        readsSession: workspace.totalReadsUsed,
        writesSession: 0,
        cacheHitsSession: 1,
        lastSyncedAt: Date.now(),
        syncMode: workspace.owner.paketAktif === 'Ultimate' ? 'LIVE_ULTIMATE' : 'CACHE_PRO',
        isLiveListenerActive: workspace.owner.paketAktif === 'Ultimate',
        isIdlePaused: false,
      });

      // Kompresi Otomatis Jadwal > 60 Hari (2 Bulan) di latar belakang persis bersihkanDanKompresArsipLama() APK
      if (fbSession.role !== 'anggota' && workspace.jadwalAktif.length > 0) {
        const batas60HariMs = Date.now() - 60 * 24 * 60 * 60 * 1000;
        const jadwalKedaluwarsa = workspace.jadwalAktif.filter((j) => {
          const waktuAcara = j.tanggalSelesaiEvent || j.tanggalMulai || j.waktuMulai || 0;
          return waktuAcara > 0 && waktuAcara < batas60HariMs;
        });

        if (jadwalKedaluwarsa.length > 0) {
          setTimeout(async () => {
            try {
              await compressOldSchedulesToFirebase(fbSession.targetOwnerId, jadwalKedaluwarsa);
              const idsKompres = new Set(jadwalKedaluwarsa.map((x) => x.idJadwal));
              setJadwalAktif((prev) => prev.filter((x) => !idsKompres.has(x.idJadwal)));
              setJadwalArsip((prev) => [
                ...jadwalKedaluwarsa.map((x) => {
                  const d = new Date(x.tanggalMulai || x.waktuMulai || Date.now());
                  return {
                    ...x,
                    isFromArchive: true,
                    archiveDocId: `arsip_${d.getFullYear()}_${String(d.getMonth() + 1).padStart(2, '0')}`,
                  };
                }),
                ...prev,
              ]);
            } catch (e) {
              console.warn('Kompresi otomatis 60 hari gagal:', e);
            }
          }, 2500);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data Firebase:', err);
    }
  };

  // Simpan / Update Jadwal
  const handleSaveJadwal = async (jadwalBaru: JadwalFotografi, autoOpenStruk = false) => {
    if (owner.tanggalLangganan && owner.tanggalLangganan > 0 && owner.tanggalLangganan < Date.now() && isReadOnlyBypass) {
      alert('Masa aktif langganan studio Anda telah berakhir. Anda sedang berada dalam Mode Darurat (Baca-Saja). Silakan perpanjang paket untuk mencatat atau mengubah jadwal.');
      setIsTestExpiredActive(true);
      return;
    }

    setJadwalAktif((prev) => {
      const exists = prev.some((j) => j.idJadwal === jadwalBaru.idJadwal);
      if (exists) {
        return prev.map((j) => (j.idJadwal === jadwalBaru.idJadwal ? jadwalBaru : j));
      }
      return [jadwalBaru, ...prev];
    });
    setFormModalMode(null);
    setEditingJadwal(null);
    setQuotaStats((prev) => ({
      ...prev,
      writesSession: prev.writesSession + 1,
    }));

    if (sessionMode === 'FIREBASE') {
      try {
        await saveJadwalToFirebase(targetOwnerId, jadwalBaru);
      } catch (err) {
        console.warn('Operasi jadwal tersimpan di persistensi lokal (offline):', err);
      }
    }

    if (autoOpenStruk) {
      setStrukModalJadwal(jadwalBaru);
    }
  };

  const handleTandaiLunas = async (jadwal: JadwalFotografi) => {
    const totalBersih = Math.max(0, jadwal.hargaKotor - jadwal.diskon);
    const updated: JadwalFotografi = {
      ...jadwal,
      status: 'Lunas',
      dpDibayar: totalBersih,
    };
    await handleSaveJadwal(updated, false);
    setAksiJadwalTarget(null);
  };

  const handleBatalkanJadwal = async (jadwal: JadwalFotografi) => {
    const updated: JadwalFotografi = {
      ...jadwal,
      status: 'Dibatalkan',
    };
    await handleSaveJadwal(updated, false);
    setAksiJadwalTarget(null);
  };

  const handleDeleteJadwal = async (idJadwal: string) => {
    setJadwalAktif((prev) => prev.filter((x) => x.idJadwal !== idJadwal));
    setAksiJadwalTarget(null);
    setQuotaStats((prev) => ({ ...prev, writesSession: prev.writesSession + 1 }));
    if (sessionMode === 'FIREBASE') {
      await deleteJadwalFromFirebase(targetOwnerId, idJadwal);
    }
  };

  const handleSavePelanggan = async (pelanggan: PelangganModel) => {
    setPelangganList((prev) => {
      const idx = prev.findIndex((p) => p.idPelanggan === pelanggan.idPelanggan);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = pelanggan;
        return copy;
      }
      return [pelanggan, ...prev];
    });
    setToastMessage('✓ Data pelanggan berhasil disimpan');
    setTimeout(() => setToastMessage(null), 3000);

    if (sessionMode === 'FIREBASE') {
      try {
        await savePelangganToFirebase(targetOwnerId, pelanggan);
      } catch (err) {
        console.warn('Gagal menyimpan pelanggan ke Firestore:', err);
      }
    }
  };

  const handleDeletePelanggan = async (idPelanggan: string) => {
    setPelangganList((prev) => prev.filter((p) => p.idPelanggan !== idPelanggan));
    setToastMessage('Data pelanggan dihapus');
    setTimeout(() => setToastMessage(null), 3000);

    if (sessionMode === 'FIREBASE') {
      try {
        await deletePelangganFromFirebase(targetOwnerId, idPelanggan);
      } catch (err) {
        console.warn('Gagal menghapus pelanggan dari Firestore:', err);
      }
    }
  };

  // Konfirmasi Pesanan Web (Persis tanganiAksiWeb di MainActivity.kt)
  const handleConfirmWebSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webConfirmTarget) return;

    const hargaDasarAwal =
      webConfirmTarget.hargaPaketDasar > 0
        ? webConfirmTarget.hargaPaketDasar
        : webConfirmTarget.hargaKotor;
    const tambahanAdmin = bersihkanTitik(webConfirmExtraStr);
    const totalKotorBaru = hargaDasarAwal + tambahanAdmin;
    const dpMasuk = bersihkanTitik(webConfirmDpStr);

    const statusBaru =
      dpMasuk >= totalKotorBaru && totalKotorBaru > 0
        ? 'Lunas'
        : dpMasuk > 0
        ? 'DP'
        : 'Booking';

    const catatanBersih = (webConfirmTarget.catatan || '')
      .replace(/VIA WEB/gi, '[Terkonfirmasi Web]')
      .replace(/\[WEB\]/gi, '[Terkonfirmasi Web]');

    const updated: JadwalFotografi = {
      ...webConfirmTarget,
      status: statusBaru,
      sumber: 'KASIR_POS',
      catatan: catatanBersih,
      hargaPaketDasar: hargaDasarAwal,
      namaTambahan: webConfirmExtraName.trim(),
      hargaTambahan: tambahanAdmin,
      hargaKotor: totalKotorBaru,
      dpDibayar: dpMasuk,
    };

    await handleSaveJadwal(updated, false);
    setWebConfirmTarget(null);
    setToastMessage('✅ Pesanan web berhasil dikonfirmasi dan jadwal dikunci!');
    setTimeout(() => setToastMessage(null), 3500);

    const pesan = bangunPesanWA(updated, owner, rekening, 'WEB_BOOKING');
    const noWa = formatNomorWA(updated.waPic);
    if (noWa) {
      const link = document.createElement('a');
      link.href = `https://api.whatsapp.com/send?phone=${noWa}&text=${encodeURIComponent(pesan)}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    }
  };

  // Simpan Pembayaran Ke-2 atau Selanjutnya (Akumulasi DP & Pelunasan Otomatis)
  const handleSaveDpModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dpModalTarget) return;
    const nominalBaru = bersihkanTitik(dpModalInputStr);
    if (nominalBaru <= 0) {
      setToastMessage('Mohon masukkan nominal pembayaran');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const totalBersih = Math.max(0, dpModalTarget.hargaKotor - dpModalTarget.diskon);
    const sudahDibayarLama = dpModalTarget.dpDibayar || 0;
    const sisaTagihanLama = Math.max(0, totalBersih - sudahDibayarLama);

    const totalAkumulasi = sudahDibayarLama + nominalBaru;
    const isLunas = nominalBaru >= sisaTagihanLama || totalAkumulasi >= totalBersih;

    const statusBaru = isLunas ? ('Lunas' as const) : ('DP' as const);
    const finalDpDibayar = isLunas ? totalBersih : totalAkumulasi;

    const labelCicilan = sudahDibayarLama > 0
      ? `[Bayar Ke-2: +${keRupiah(nominalBaru)}]`
      : `[DP: +${keRupiah(nominalBaru)}]`;
    const updatedCatatan = dpModalTarget.catatan
      ? `${dpModalTarget.catatan} ${labelCicilan}`
      : labelCicilan;

    const updated: JadwalFotografi = {
      ...dpModalTarget,
      dpDibayar: finalDpDibayar,
      status: statusBaru,
      catatan: updatedCatatan,
    };

    await handleSaveJadwal(updated, false);
    setDpModalTarget(null);
    setDpModalInputStr('');

    if (isLunas) {
      setToastMessage(`🎉 Pembayaran berhasil! Tagihan lunas penuh (${keRupiah(totalBersih)})!`);
    } else {
      setToastMessage(
        `✅ Pembayaran ke-2 dicatat! Akumulasi masuk: ${keRupiah(totalAkumulasi)}, Sisa tagihan: ${keRupiah(
          Math.max(0, totalBersih - totalAkumulasi)
        )}`
      );
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Kirim Pesan WhatsApp (Tagih Sisa / Konfirmasi Kehadiran)
  const handleKirimWA = (jadwal: JadwalFotografi, tipe: 'TAGIHAN' | 'KONFIRMASI') => {
    const pesan = bangunPesanWA(jadwal, owner, rekening, tipe);
    const noWa = formatNomorWA(jadwal.waPic);
    if (!noWa) return;

    const link = document.createElement('a');
    link.href = `https://api.whatsapp.com/send?phone=${noWa}&text=${encodeURIComponent(pesan)}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  // Helper deteksi apakah jadwal adalah Pesanan Form Web yang BELUM dikonfirmasi Admin
  const isUnconfirmedWebBooking = (j: JadwalFotografi): boolean => {
    const st = (j.status || '').trim().toLowerCase();
    if (st === 'lunas' || st === 'dp' || st === 'sudah dp' || st === 'dibatalkan') {
      return false;
    }
    if (
      st === 'menunggu konfirmasi' ||
      st === 'pending' ||
      st === 'menunggu' ||
      st === 'booking web' ||
      st === 'web'
    ) {
      return true;
    }
    const sumb = (j.sumber || '').trim().toUpperCase();
    const cat = (j.catatan || '').toUpperCase();
    const hasWebMarker =
      sumb === 'WEB' || cat.includes('VIA WEB') || cat.includes('[WEB]');
    if (hasWebMarker && (j.dpDibayar || 0) <= 0) {
      return true;
    }
    return false;
  };

  // Daftar Pesanan Web Menunggu Konfirmasi
  const listPesananWebMenunggu = useMemo(
    () => jadwalAktif.filter((j) => isUnconfirmedWebBooking(j)),
    [jadwalAktif]
  );

  // Jadwal yang sudah resmi tampil di Kalender & Daftar
  const listJadwalValid = useMemo(
    () => jadwalAktif.filter((j) => !isUnconfirmedWebBooking(j)),
    [jadwalAktif]
  );

  // Data Grid Kalender Bulanan
  const calendarDays = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: {
      dayNumber: number | null;
      dateKey: string | null;
      isToday: boolean;
      events: JadwalFotografi[];
    }[] = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ dayNumber: null, dateKey: null, isToday: false, events: [] });
    }

    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayStart = new Date(year, month, d, 0, 0, 0, 0).getTime();
      const dayEnd = new Date(year, month, d, 23, 59, 59, 999).getTime();

      const matching = jadwalAktif.filter((j) => {
        if (j.status.toLowerCase() === 'dibatalkan') return false;
        const start = j.tanggalMulai || j.waktuMulai;
        const end = j.tanggalSelesaiEvent || start;
        const sDay = new Date(start);
        sDay.setHours(0, 0, 0, 0);
        const eDay = new Date(end);
        eDay.setHours(23, 59, 59, 999);
        return dayStart >= sDay.getTime() && dayEnd <= eDay.getTime();
      });

      cells.push({
        dayNumber: d,
        dateKey,
        isToday: dateKey === todayKey,
        events: matching,
      });
    }

    return cells;
  }, [currentCalendarDate, jadwalAktif]);

  // Ringkasan Statistik Jadwal Resmi Bulan Ini (Di luar yang masih Menunggu Konfirmasi Web)
  const ringkasanBulanIni = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    const eventBulanIni = listJadwalValid.filter((j) => {
      if (j.status.toLowerCase() === 'dibatalkan') return false;
      const dObj = new Date(j.tanggalMulai || j.waktuMulai);
      return dObj.getFullYear() === year && dObj.getMonth() === month;
    });

    let jmlLunas = 0;
    let jmlSudahDp = 0;
    let jmlBookingBaru = 0;

    eventBulanIni.forEach((e) => {
      const st = e.status.toLowerCase();
      if (st === 'lunas') {
        jmlLunas++;
      } else if (st === 'dp' || st === 'sudah dp' || (e.dpDibayar || 0) > 0) {
        jmlSudahDp++;
      } else {
        jmlBookingBaru++;
      }
    });

    return {
      totalEventBulanIni: eventBulanIni.length,
      jmlLunas,
      jmlSudahDp,
      jmlBookingBaru,
    };
  }, [listJadwalValid, currentCalendarDate]);

  // Pesanan Web Menunggu Konfirmasi (Muncul semua saat lonceng diklik, atau sesuai tanggal yang diklik)
  const pesananWebPadaTanggalDipilih = useMemo(() => {
    if (statusFilter === 'BOOKING_WEB') {
      return [...listPesananWebMenunggu].sort((a, b) => a.waktuMulai - b.waktuMulai);
    }
    if (!selectedDateStr || statusFilter !== 'TANGGAL_DIPILIH') return [];
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

    return listPesananWebMenunggu.filter((j) => {
      const start = j.tanggalMulai || j.waktuMulai;
      const end = j.tanggalSelesaiEvent || start;
      const sDay = new Date(start);
      sDay.setHours(0, 0, 0, 0);
      const eDay = new Date(end);
      eDay.setHours(23, 59, 59, 999);
      return dayStart >= sDay.getTime() && dayEnd <= eDay.getTime();
    });
  }, [listPesananWebMenunggu, selectedDateStr, statusFilter]);

  // Daftar Jadwal Resmi Terfilter di Kolom Kanan (Pesanan Web belum masuk sebelum dikonfirmasi)
  const filteredScheduleList = useMemo(() => {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();

    return listJadwalValid
      .filter((j) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            j.namaKlien.toLowerCase().includes(q) ||
            j.namaAcara.toLowerCase().includes(q) ||
            j.lokasi.toLowerCase().includes(q) ||
            j.paket.toLowerCase().includes(q)
          );
        }

        if (selectedDateStr && statusFilter === 'TANGGAL_DIPILIH') {
          const [y, m, d] = selectedDateStr.split('-').map(Number);
          const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
          const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
          const start = j.tanggalMulai || j.waktuMulai;
          const end = j.tanggalSelesaiEvent || start;
          const sDay = new Date(start);
          sDay.setHours(0, 0, 0, 0);
          const eDay = new Date(end);
          eDay.setHours(23, 59, 59, 999);
          return dayStart >= sDay.getTime() && dayEnd <= eDay.getTime();
        }

        const dObj = new Date(j.tanggalMulai || j.waktuMulai);
        const inMonth = dObj.getFullYear() === year && dObj.getMonth() === month;
        if (!inMonth) return false;

        if (statusFilter === 'BELUM_LUNAS') {
          const st = j.status.toLowerCase();
          if (st === 'lunas' || st === 'dibatalkan') return false;
          const sisa = Math.max(0, j.hargaKotor - j.diskon - j.dpDibayar);
          return sisa > 0 || st === 'booking' || st === 'dp' || st === 'sudah dp';
        }
        if (statusFilter === 'SUDAH_DP') {
          const st = j.status.toLowerCase();
          if (st === 'lunas' || st === 'dibatalkan') return false;
          return st === 'dp' || st === 'sudah dp' || (j.dpDibayar || 0) > 0;
        }
        if (statusFilter === 'BOOKING_BARU') {
          const st = j.status.toLowerCase();
          if (st === 'lunas' || st === 'dibatalkan') return false;
          return st !== 'dp' && st !== 'sudah dp' && (j.dpDibayar || 0) <= 0;
        }
        if (statusFilter === 'LUNAS') {
          return j.status.toLowerCase() === 'lunas';
        }
        return true;
      })
      .sort((a, b) => a.waktuMulai - b.waktuMulai);
  }, [listJadwalValid, currentCalendarDate, searchQuery, selectedDateStr, statusFilter]);

  // WARNA & GAYA LATAR NAVIGASI (Header, Bar & Toolbar):
  // Fokus khusus mengatur warna navigasi, bar color, dan toolbar.
  // Latar belakang utama aplikasi TIDAK dipengaruhi oleh warna ini, melainkan diatur oleh wallpaper (terang/gelap).
  const navThemeColor = owner.warnaTema || '#34495E';
  const navBgStyleMode = owner.gayaLatarNavigasi || 'SOLID';
  const navOpacityPercent = typeof owner.opasitasNavigasi === 'number' ? owner.opasitasNavigasi : 95;
  const navAlpha = Math.max(0.4, Math.min(1, navOpacityPercent / 100));

  // Helper konversi HEX ke RGBA
  const hexToRgba = (hex: string, alpha: number) => {
    let clean = (hex || '#34495E').replace('#', '').trim();
    if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
    if (clean.length !== 6) return `rgba(52, 73, 94, ${alpha})`;
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Gaya Latar Belakang Navigasi, Bar & Toolbar (Header, Mobile Bar, Sidebar PC)
  const navBackgroundComputed: React.CSSProperties = useMemo(() => {
    if (navBgStyleMode === 'GLASS') {
      return {
        backgroundColor: hexToRgba(navThemeColor, Math.min(0.85, navAlpha * 0.85)),
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
      };
    }
    if (navBgStyleMode === 'GRADIENT') {
      return {
        background: `linear-gradient(135deg, ${hexToRgba(navThemeColor, navAlpha)} 0%, rgba(15, 23, 42, 0.95) 100%)`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
      };
    }
    if (navBgStyleMode === 'DARK_ACCENT') {
      return {
        backgroundColor: 'rgba(18, 22, 30, 0.96)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottomColor: navThemeColor,
        borderBottomWidth: '2px',
        borderColor: 'rgba(255, 255, 255, 0.12)',
      };
    }
    // SOLID (Default)
    return {
      backgroundColor: hexToRgba(navThemeColor, navAlpha),
      backdropFilter: navAlpha < 1 ? 'blur(12px)' : undefined,
      WebkitBackdropFilter: navAlpha < 1 ? 'blur(12px)' : undefined,
      borderColor: 'rgba(255, 255, 255, 0.12)',
    };
  }, [navThemeColor, navBgStyleMode, navAlpha]);

  // Helper penanda aktif pada menu navigasi (sidebar & drawer)
  const getNavActiveItemStyle = (isActive: boolean): React.CSSProperties | undefined => {
    if (!isActive) return undefined;
    return {
      backgroundColor: navThemeColor,
      color: '#FFFFFF',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.25)',
    };
  };

  // LATAR BELAKANG UTAMA (DIATUR OLEH WALLPAPER YG PUNYA TERANG / GELAP SAJA, ABAIKAN BG UTAMA DARI WARNA TEMA):
  const isKacaGelap = owner.isKacaGelap !== false;
  const customBgUrl = owner.customBackgroundUrl || '';
  const customBgBlur = typeof owner.customBackgroundBlur === 'number' ? owner.customBackgroundBlur : 8;
  const customBgOpacity = typeof owner.customBackgroundOpacity === 'number' ? owner.customBackgroundOpacity : 60;
  const isWhiteOverlay = owner.customBackgroundOverlayType === 'PUTIH';
  const customBgOverlayColor = isWhiteOverlay ? '#FFFFFF' : '#000000';

  // Base background warna utama aplikasi (netral gelap atau netral terang, TIDAK terdistorsi oleh warna navigasi)
  const bgMainAppColor = isKacaGelap ? '#0E131F' : '#F1F5F9';

  useEffect(() => {
    // Sinkronisasi status bar mobile / address bar browser ke warna tema navigasi
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', navThemeColor);
    // Background body mengikuti mode wallpaper terang/gelap (bukan warna tema navigasi)
    document.body.style.backgroundColor = customBgUrl
      ? (isWhiteOverlay ? '#F1F5F9' : '#0B0F17')
      : bgMainAppColor;
  }, [navThemeColor, customBgUrl, isWhiteOverlay, bgMainAppColor]);

  // SPLASH SCREEN ("FLASH") SAAT RELOAD AGAR TIDAK TERLEMPAR KE HALAMAN LOGIN
  if (isAuthChecking && !sessionMode) {
    return (
      <div
        className="min-h-screen w-full flex flex-col items-center justify-center p-6 select-none"
        style={{ backgroundColor: '#12161F', color: '#FFFFFF' }}
      >
        <div className="relative flex flex-col items-center">
          <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-amber-600/60 via-amber-200/40 to-amber-500/60 shadow-2xl animate-pulse">
            <img
              src="/pwa-512x512.png"
              alt="kafela's Agenda"
              className="w-full h-full rounded-full object-contain object-center bg-[#FAF9F6]"
            />
          </div>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-white">
            Kafela&apos;s Agenda
          </h1>
          <p className="mt-1 text-xs text-slate-400">Memulihkan sesi akun Anda...</p>
        </div>
      </div>
    );
  }

  // Jika mode Super Admin Master Console aktif
  if (viewMode === 'SUPER_ADMIN') {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <SuperAdminDashboard
          onSelectBrandForCashier={handleSelectBrandForCashier}
          onExitSuperAdmin={() => {
            setViewMode('CASHIER');
            if (typeof window !== 'undefined' && window.history.pushState) {
              const url = new URL(window.location.href);
              url.searchParams.delete('mode');
              url.searchParams.delete('super_admin');
              url.pathname = '/';
              window.history.pushState({}, '', url.toString());
            }
          }}
        />
      </Suspense>
    );
  }

  // Jika belum login setelah pengecekan selesai, tampilkan Halaman Login
  if (!sessionMode) {
    return (
      <LoginAndSetupScreen
        onStartDemo={handleStartDemo}
        onLoginFirebaseSuccess={(s) => handleLoginFirebaseSuccess(s, false)}
        onOpenSuperAdmin={() => setViewMode('SUPER_ADMIN')}
      />
    );
  }

  const isKruAnggota = userRole === 'anggota';
  const isSubscriptionExpired = Boolean(
    owner.tanggalLangganan &&
    owner.tanggalLangganan > 0 &&
    owner.tanggalLangganan < Date.now()
  );
  const sisaHariLangganan = Math.max(
    0,
    Math.ceil((owner.tanggalLangganan - Date.now()) / (1000 * 60 * 60 * 24))
  );

  const handlePerformLogout = async () => {
    if (sessionMode === 'DEMO') {
      handleExitDemo();
    } else {
      if (sessionMode === 'FIREBASE') {
        await logoutFirebaseSession();
      }
      try {
        localStorage.removeItem(SESSION_META_KEY);
        if (targetOwnerId) {
          localStorage.removeItem(getWorkspaceCacheKey(targetOwnerId));
        }
        localStorage.removeItem(LEGACY_CACHE_KEY);
        sessionStorage.clear();
      } catch {}
      setJadwalAktif([]);
      setJadwalArsip([]);
      setPaketList([]);
      setTimList([]);
      setSessionMode(null);
    }
  };

  const handleUpdateOwnerProfile = async (updates: Partial<OwnerProfile>) => {
    setOwner((prev) => ({ ...prev, ...updates }));
    if (sessionMode === 'FIREBASE') {
      await saveOwnerProfileToFirebase(targetOwnerId, updates);
    }
  };

  // HALAMAN HABIS LANGGANAN: Aktif jika masa langganan habis (dan belum bypass mode baca-saja darurat) ATAU sedang simulasi/pratinjau
  if ((isSubscriptionExpired && !isReadOnlyBypass) || isTestExpiredActive) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
        <SubscriptionExpiredScreen
          owner={owner}
          userRole={userRole}
          onUpdateOwner={handleUpdateOwnerProfile}
          onEnterReadOnly={() => setIsReadOnlyBypass(true)}
          onLogout={handlePerformLogout}
          isTestPreview={isTestExpiredActive}
          onCloseTestMode={() => setIsTestExpiredActive(false)}
        />
      </Suspense>
    );
  }


  const cardOpacityVal = typeof owner.opasitasKartu === 'number'
    ? owner.opasitasKartu
    : customBgUrl ? 58 : 70;
  const cardOpacity = cardOpacityVal / 100;

  const cardBgStyle = isKacaGelap
    ? {
        backgroundColor: `rgba(20, 24, 32, ${cardOpacity})`,
        borderColor: 'rgba(255, 255, 255, 0.14)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }
    : {
        backgroundColor: `rgba(255, 255, 255, ${Math.min(0.88, cardOpacity + 0.1)})`,
        borderColor: 'rgba(0, 0, 0, 0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      };
  const textPrimaryColor = isKacaGelap ? '#FFFFFF' : '#2C3E50';
  const textSecondaryColor = isKacaGelap ? '#BBBBBB' : '#555555';

  const renderSidebarNav = (isDrawer: boolean) => (
    <div className="flex flex-col h-full select-none">
      {/* Header Drawer / Sidebar Mengikuti Warna Tema Studio */}
      <div className="p-3 shrink-0" style={navBackgroundComputed}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="  px-3 font-bold text-white truncate max-w-[200px]" style={{ fontSize: '20px' }}>
              {owner.namaBrand || "Kafela's Agenda"}
            </h2>
            <p className=" px-3 mt-0.5 text-xs text-white/80 truncate max-w-[200px]">
              {owner.jenisUsaha || "Manajemen Jadwal & Kasir"}
            </p>
          </div>
          {isDrawer && (
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded-lg text-white/70 hover:text-white cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mt-1 space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
              👤 {activeUserName}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {userRole === 'owner' ? 'Owner' : userRole === 'admin' ? 'Admin' : 'Crew'}
            </span>
          </div>
          {activeUserEmail && (
<p className="text-[10px] text-slate-400 font-mono truncate pt-0">
  {(activeUserEmail || '').split('@')[0]}
</p>          )}
        </div>

        {/* Card Status Paket (Disembunyikan untuk Anggota / Crew) */}
        {!isKruAnggota && (
          <div
            role="button"
            tabIndex={0}
         onClick={(e) => {
e.stopPropagation();
setPengaturanSubTab('PAKET');
setActiveTab('PENGATURAN');
if (isDrawer) setDrawerOpen(false);
}}
            className="mt-1 rounded-[12px] px-3 py-1.5 border border-white/20 cursor-pointer hover:border-amber-400 hover:bg-white/10 active:scale-[0.98] transition-all shadow-md group relative"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.35)' }}
            title="Klik untuk lihat pilihan paket & perpanjang langganan"
          >
<div className="flex items-center justify-between gap-3">
  {/* Kiri: Sisa Hari & Nama Paket */}
  <div className="flex flex-col gap-1 min-w-0">
    <span className="text-[11px] text-gray-200 whitespace-nowrap">
      Sisa {sisaHariLangganan} Hari
    </span>

    <span
      className="font-bold truncate"
      style={{ fontSize: '12px', color: '#2ECC71' }}
    >
      {owner.paketAktif.toUpperCase()}
    </span>
  </div>

  {/* Kanan: Saldo & Tombol Kelola */}
  <div className="flex flex-col items-end gap-1">
    <span className="text-[11px] text-gray-200 whitespace-nowrap">
      Rp {(owner.saldo || 0).toLocaleString('id-ID')}
    </span>

    <span className="shrink-0 text-[10px] font-bold text-amber-300 group-hover:text-amber-200 bg-amber-500/20 px-2 py-1 rounded border border-amber-400/40 whitespace-nowrap">
      Kelola Saldo & Paket →
    </span>
  </div>
</div>
          </div>
        )}
      </div>

      {/* Daftar Menu */}
      <div className="flex-1 p-3 space-y-1 text-sm overflow-y-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('KALENDER');
            if (isDrawer) setDrawerOpen(false);
            bumpCacheHit();
          }}
          className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all cursor-pointer ${
            activeTab === 'KALENDER'
              ? 'text-white'
              : 'text-[#DDDDDD] hover:bg-white/5'
          }`}
          style={getNavActiveItemStyle(activeTab === 'KALENDER')}
        >
          <CalendarIcon className="w-4 h-4 shrink-0" />
          <span>Kalender &amp; Daftar Jadwal</span>
        </button>

        {!isKruAnggota && (
          <>
            <button
              type="button"
              onClick={() => {
                if (isDrawer) setDrawerOpen(false);
                setEditingJadwal(null);
                setFormModalMode('KASIR_CEPAT');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[#2ECC71] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>Kasir Cepat</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isDrawer) setDrawerOpen(false);
                setEditingJadwal(null);
                setFormModalMode('TAMBAH_AGENDA');
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[#64B5F6] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Tambah Jadwal Booking</span>
            </button>

            <div className="my-2 border-t border-white/10" />

            <button
              type="button"
              onClick={() => {
                setActiveTab('PAKET');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PAKET'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'PAKET')}
            >
              <Layers className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Paket Layanan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PELANGGAN');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PELANGGAN'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'PELANGGAN')}
            >
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Daftar Pelanggan</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('LAPORAN');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'LAPORAN'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'LAPORAN')}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Laporan Keuangan &amp; Piutang</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('ARSIP');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'ARSIP'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'ARSIP')}
            >
              <Archive className="w-4 h-4 shrink-0" />
              <span>Gudang Arsip &amp; Pencarian</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('TIM');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'TIM'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'TIM')}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Kelola Tim &amp; Crew</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (isDrawer) setDrawerOpen(false);
                setTemaModalOpen(true);
              }}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-bold text-[#DDDDDD] hover:bg-white/5 transition-colors cursor-pointer"
            >
              <Palette className="w-4 h-4 text-[#F39C12] shrink-0" />
              <span>Ganti Tema &amp; Wallpaper</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPengaturanSubTab('PROFIL');
                setActiveTab('PENGATURAN');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PENGATURAN' && pengaturanSubTab === 'PROFIL'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'PENGATURAN' && pengaturanSubTab === 'PROFIL')}
            >
              <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Profil &amp; Struk</span>
            </button>

            <div className="my-1 border-t border-white/10" />
            <p className="px-3.5 py-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Pengaturan &amp; Website
            </p>

            <button
              type="button"
              onClick={() => {
                setPengaturanSubTab('WEB');
                setActiveTab('PENGATURAN');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PENGATURAN' && textPrimaryColor && pengaturanSubTab === 'WEB'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'PENGATURAN' && pengaturanSubTab === 'WEB')}
            >
              <Globe className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Website &amp; Link Booking</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPengaturanSubTab('WA');
                setActiveTab('PENGATURAN');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PENGATURAN' && pengaturanSubTab === 'WA'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'PENGATURAN' && pengaturanSubTab === 'WA')}
            >
              <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Template WhatsApp</span>
            </button>


            <button
              type="button"
              onClick={() => {
                setPengaturanSubTab('REKENING');
                setActiveTab('PENGATURAN');
                if (isDrawer) setDrawerOpen(false);
                bumpCacheHit();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'PENGATURAN' && pengaturanSubTab === 'REKENING'
                  ? 'text-white'
                  : 'text-[#DDDDDD] hover:bg-white/5'
              }`}
              style={getNavActiveItemStyle(activeTab === 'PENGATURAN' && pengaturanSubTab === 'REKENING')}
            >
              <CreditCard className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Rekening &amp; QRIS</span>
            </button>
          </>
        )}


        <div className="px-2 py-1 space-y-2">
          <PWAInstallButton />
        </div>
        {sessionMode === 'DEMO' ? (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                if (isDrawer) setDrawerOpen(false);
                handleExitDemo();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-600/40 border border-amber-500/40 cursor-pointer active:scale-[0.98] transition-all shadow-md"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Keluar Mode Demo</span>
            </button>
            <p className="text-[10px] text-center text-amber-200/70">
              Kembali ke Layar Login Utama
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={async () => {
              if (isDrawer) setDrawerOpen(false);
              await handlePerformLogout();
            }}
            className="w-full flex gap-3 px-4 mt-3 font-bold text-white cursor-pointer hover:opacity-95  transition-all shadow-md"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Keluar Akun</span>
          </button>
        )}
      </div>

      {/* Footer Logout & Versi */}
      <div className="p-2 border-t border-white/10 mt-auto shrink-0 space-y-1">
        

        <button
          type="button"
          onClick={() => {
            if (isDrawer) setDrawerOpen(false);
            if (needRefresh) {
              updateServiceWorker(true);
            } else {
              setToastMessage('✓ Aplikasi sudah menggunakan versi terbaru.');
              setTimeout(() => setToastMessage(null), 3000);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 cursor-pointer active:scale-[0.98] transition-all text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span>Cek Pembaruan Aplikasi (v.4.16)</span>
        </button>

    
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen w-full select-none transition-colors duration-300 relative overflow-x-hidden"
      style={{
        backgroundColor: customBgUrl ? (isWhiteOverlay ? '#F1F5F9' : '#0B0F17') : bgMainAppColor,
        color: '#FFFFFF',
      }}
    >
      {/* Layer Wallpaper / Foto Background dengan Efek Blur & Gelap yang dapat diatur */}
      {customBgUrl && (
        <div
          className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="absolute inset-[-25px] bg-cover bg-center bg-no-repeat transition-all duration-300 will-change-transform"
            style={{
              backgroundImage: `url(${customBgUrl})`,
              filter: `blur(${customBgBlur}px)`,
              transform: 'scale(1.08)',
            }}
          />
          {/* Overlay netral (Hitam Murni atau Putih Murni, tanpa bias merah/warna lain) */}
          <div
            className="absolute inset-0 transition-all duration-300"
            style={{
              backgroundColor: customBgOverlayColor,
              opacity: customBgOpacity / 100,
            }}
          />
        </div>
      )}

      <div
        className="min-h-screen w-full flex flex-col relative z-10 transition-all duration-300"
        style={{ backgroundColor: customBgUrl ? 'transparent' : bgMainAppColor, color: '#FFFFFF' }}
      >
        <OfflineIndicator />
        <PWAInstallFloatingBanner />

        {/* Banner Peringatan Darurat (Baca-Saja) Jika Langganan Habis tapi di-Bypass */}
        {isSubscriptionExpired && isReadOnlyBypass && (
          <div className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2 shadow-lg z-40 border-b border-red-500/50">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>
                <b>PERINGATAN:</b> Masa aktif langganan studio Anda telah berakhir. Anda sedang berada dalam <b>Mode Darurat (Baca-Saja)</b>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsTestExpiredActive(true)}
              className="px-3.5 py-1 bg-white text-slate-950 hover:bg-slate-100 rounded-lg font-black text-xs cursor-pointer shadow transition active:scale-95"
            >
              Perpanjang / Top-Up Sekarang →
            </button>
          </div>
        )}

        {/* Early Warning Banner (Pengingat H-3 Sebelum Habis) */}
        {!isSubscriptionExpired && sisaHariLangganan <= 3 && sisaHariLangganan > 0 && !isKruAnggota && (
          <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-1.5 text-xs font-medium flex flex-wrap items-center justify-between gap-2 z-40 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <span>⏱️</span>
              <span>
                Pengingat Masa Aktif: Langganan studio Anda tersisa <b>{sisaHariLangganan} hari lagi</b>.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTopUpGlobalOpen(true)}
                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer transition"
              >
                + Top-Up Saldo
              </button>
              <button
                type="button"
                onClick={() => {
                  setPengaturanSubTab('PAKET');
                  setActiveTab('PENGATURAN');
                }}
                className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-bold cursor-pointer transition"
              >
                Perpanjang Sekarang →
              </button>
            </div>
          </div>
        )}


        {/* ===================================================================== */}
        {/* HEADER ATAS:                                                          */}
        {/* - DI HP: Ringkas persis layoutHeaderAtas di activity_main.xml         */}
        {/* - DI PC: Header Desktop Profesional dengan Search & Tombol Cepat      */}
        {/* ===================================================================== */}
        <header
          className={
            isMobileLayout
              ? 'px-3.5 py-2 flex items-center justify-between gap-2 border-b border-white/10 sticky top-0 z-30 transition-all duration-200'
              : 'px-6 py-2.5 min-h-[64px] flex items-center justify-between gap-4 border-b border-white/10 sticky top-0 z-30 shadow-md transition-all duration-200'
          }
          style={navBackgroundComputed}
        >
          {/* Kiri: Tombol Drawer / Sidebar (PC & HP) + Judul Kafela's Agenda */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (isMobileLayout) {
                  setDrawerOpen(true);
                } else {
                  setDesktopSidebarOpen((prev) => !prev);
                }
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Buka / Tutup Menu Navigasi"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setActiveTab('KALENDER')}
            >
              <img
                src={owner.logoBrandUrl || '/pwa-512x512.png'}
                alt={owner.namaBrand || "kafela's Agenda"}
                className="w-10 h-10 rounded-full object-contain object-center p-0.5 bg-[#FAF9F6] shadow-md border border-white/25 shrink-0"
              />
              <div>
                <h1
                  className="font-extrabold tracking-tight text-white leading-tight"
                  style={{
                    fontSize: isMobileLayout ? '17px' : '19px',
                    textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                  }}
                >
                  {owner.namaBrand || "Kafela's Agenda"}
                </h1>
  <p className="text-[11px] text-white/85 leading-tight flex items-center gap-1.5 flex-wrap">
    <span className="font-bold text-amber-300">
      👤 {activeUserName === 'Owner' ? 'Owner' : activeUserName}
    </span>
    <span className="text-white/40">•</span>
    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
      {userRole === 'owner' ? 'Owner' : userRole === 'admin' ? 'Admin' : 'Anggota Tim'}
    </span>
  </p>
              </div>
            </div>
          </div>

          {/* Tengah (Khusus Layar PC): Pencarian Cepat Desktop */}
          {!isMobileLayout && (
            <div
              className="flex-1 max-w-lg mx-4 flex items-center rounded-xl px-4 py-2 border shadow-inner"
              style={{
                backgroundColor: isKacaGelap
                  ? 'rgba(255, 255, 255, 0.07)'
                  : 'rgba(255, 255, 255, 0.92)',
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Search
                className="w-4 h-4 mr-2.5 shrink-0"
                style={{ color: isKacaGelap ? '#AAAAAA' : '#666666' }}
              />
              <input
                type="text"
                placeholder="Cari nama klien, acara, paket, lokasi, atau nomor WA..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'KALENDER') setActiveTab('KALENDER');
                  bumpCacheHit();
                }}
                className="w-full bg-transparent text-xs sm:text-sm focus:outline-none"
                style={{ color: textPrimaryColor }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="ml-1 text-xs opacity-70 hover:opacity-100 cursor-pointer"
                  style={{ color: textPrimaryColor }}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Kanan: Tombol Cepat PC + "X Event" + Lonceng Notifikasi Web */}
          <div className="flex items-center gap-2">
            {!isMobileLayout && !isKruAnggota && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingJadwal(null);
                    setFormModalMode('KASIR_CEPAT');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                  style={{ backgroundColor: '#27AE60' }}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Kasir Cepat</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingJadwal(null);
                    setFormModalMode('TAMBAH_AGENDA');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
                  style={{ backgroundColor: '#2980B9' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Jadwal</span>
                </button>
              </>
            )}

            

  {!isMobileLayout && (
  <button
    type="button"
    onClick={() => {
      setActiveTab('KALENDER');
      setSelectedDateStr(null);
      setStatusFilter('SEMUA_BULAN');
      bumpCacheHit();
    }}
    className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition-transform hover:scale-105 cursor-pointer shadow-xs"
    style={{
      backgroundColor:
        statusFilter === 'SEMUA_BULAN' ? '#2980B9' : 'rgba(255, 255, 255, 0.14)',
      color: '#FFFFFF',
      border:
        statusFilter === 'SEMUA_BULAN'
          ? '1px solid rgba(255, 255, 255, 0.45)'
          : '1px solid rgba(255, 255, 255, 0.15)',
    }}
    title={`Total ${ringkasanBulanIni.totalEventBulanIni} item jadwal di bulan ${currentCalendarDate.toLocaleDateString('id-ID', { month: 'long' })} (klik untuk lihat semua)`}
  >
    {ringkasanBulanIni.totalEventBulanIni} Item
  </button>
)}

            {!isKruAnggota && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('KALENDER');
                  setSelectedDateStr(null);
                  setStatusFilter('BOOKING_WEB');
                  bumpCacheHit();
                }}
                className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
                  statusFilter === 'BOOKING_WEB' ? 'bg-white/20' : 'hover:bg-white/10'
                }`}
                title="Klik untuk menampilkan daftar pesanan dari Website Klien"
              >
                <Bell className="w-5 h-5 text-white" />
                {listPesananWebMenunggu.length > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow"
                    style={{ backgroundColor: '#E74C3C' }}
                  >
                    {listPesananWebMenunggu.length}
                  </span>
                )}
              </button>
            )}

            {/* Tombol Lihat Web Profil Publik Brand Ini */}
            <a
              href={`/profil.html?id=${encodeURIComponent(owner.username || activeBrandSlug || 'kfls')}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 transition-all shadow-xs"
              title="Buka Website Profil Publik Brand Ini"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Web Publik</span>
            </a>


          </div>
        </header>

      {/* ===================================================================== */}
      {/* NAVIGATION DRAWER PERSIS nav_header.xml APK ANDROID                   */}
      {/* ===================================================================== */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside
            className="relative w-[300px] max-w-[85vw] h-full flex flex-col shadow-2xl z-10 overflow-hidden"
            style={{ backgroundColor: '#121212', color: '#FFFFFF' }}
          >
            {renderSidebarNav(true)}
          </aside>
        </div>
      )}

      {/* ===================================================================== */}
      {/* KONTEN UTAMA:                                                         */}
      {/* - DI HP: 1 Kolom Penuh (Kalender di Atas, Jadwal di Bawah)            */}
      {/* - DI WEB PC: Menu Samping (Sidebar Kiri) Muncul Langsung + Konten     */}
      {/* ===================================================================== */}
      <div className="flex-1 flex w-full">
        {/* MENU SAMPING PERMANEN KHUSUS TAMPILAN WEB PC (MENGIKUTI SIDEBAR HP) */}
        {!isMobileLayout && desktopSidebarOpen && (
          <aside
            className="w-[300px] shrink-0 flex flex-col border-r border-white/10 shadow-2xl sticky top-[64px] h-[calc(100vh-64px)] overflow-hidden transition-all duration-200 z-20"
            style={{ backgroundColor: '#121212', color: '#FFFFFF' }}
          >
            {renderSidebarNav(false)}
          </aside>
        )}

      <main
        className={`flex-1 w-full mx-auto ${
          isMobileLayout ? 'py-2.5 px-2.5 pb-24' : 'max-w-[1440px] py-6 px-6'
        }`}
      >
        {activeTab === 'KALENDER' && (
          <div>
            {/* =============================================================== */}
            {/* SUSUNAN KALENDER & DAFTAR JADWAL:                               */}
            {/* - LAYAR HP: 1 Kolom (Kalender di Atas, Jadwal di Bawah)         */}
            {/* - LAYAR PC: 2 Kolom Proporsional Selalu Berdampingan (5 : 7)    */}
            {/* =============================================================== */}
            <div
              className={
                isMobileLayout
                  ? 'grid grid-cols-1 gap-3 items-start'
                  : 'grid grid-cols-12 gap-6 items-start'
              }
            >
              {/* ============================================================= */}
              {/* KOLOM KIRI: KARTU KALENDER (+ RINGKASAN BULAN INI DI PC)      */}
              {/* ============================================================= */}
              <div className={isMobileLayout ? 'space-y-3' : 'col-span-5 space-y-4'}>
                <div
                  className={
                    isMobileLayout
                      ? 'rounded-[14px] px-3 py-2.5 sm:p-4 shadow-xl border backdrop-blur-md touch-pan-y overflow-hidden cursor-grab active:cursor-grabbing'
                      : 'rounded-2xl p-5 shadow-2xl border backdrop-blur-md touch-pan-y overflow-hidden cursor-grab active:cursor-grabbing'
                  }
                  style={cardBgStyle}
                  onTouchStart={(e) => {
                    if (e.touches.length > 0) {
                      handleCalendarSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchMove={(e) => {
                    if (e.touches.length > 0) {
                      handleCalendarSwipeMove(e.touches[0].clientX, e.touches[0].clientY);
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (e.changedTouches.length > 0) {
                      handleCalendarSwipeEnd(
                        e.changedTouches[0].clientX,
                        e.changedTouches[0].clientY
                      );
                    } else {
                      setCalendarDragOffset(0);
                      isCalendarDragging.current = false;
                    }
                  }}
                  onMouseDown={(e) => {
                    handleCalendarSwipeStart(e.clientX, e.clientY);
                  }}
                  onMouseMove={(e) => {
                    if (isCalendarDragging.current) {
                      handleCalendarSwipeMove(e.clientX, e.clientY);
                    }
                  }}
                  onMouseUp={(e) => {
                    if (isCalendarDragging.current) {
                      handleCalendarSwipeEnd(e.clientX, e.clientY);
                    }
                  }}
                  onMouseLeave={() => {
                    if (isCalendarDragging.current) {
                      isCalendarDragging.current = false;
                      calendarTouchStartX.current = null;
                      calendarTouchStartY.current = null;
                      setCalendarDragOffset(0);
                    }
                  }}
                >
                  <div
                    className="transition-transform duration-150 ease-out"
                    style={{
                      transform:
                        calendarDragOffset !== 0
                          ? `translateX(${calendarDragOffset}px)`
                          : 'translateX(0px)',
                    }}
                  >
                    {/* Navigasi Bulan Kalender */}
                    <div className="flex items-center justify-between mb-2">
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentCalendarDate(
                            new Date(
                              currentCalendarDate.getFullYear(),
                              currentCalendarDate.getMonth() - 1,
                              1
                            )
                          )
                        }
                        className="p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                        style={{ color: textPrimaryColor }}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="text-center flex flex-col items-center justify-center">
                        <h2
                          onClick={() => {
                            setCurrentCalendarDate(new Date());
                            setSelectedDateStr(null);
                            setStatusFilter('SEMUA_BULAN');
                          }}
                          className="font-extrabold tracking-tight capitalize cursor-pointer hover:opacity-85 transition-opacity"
                          style={{
                            fontSize: isMobileLayout ? '16px' : '18px',
                            color: textPrimaryColor,
                          }}
                          title="Klik untuk kembali ke bulan ini"
                        >
                          {currentCalendarDate.toLocaleDateString('id-ID', {
                            month: 'long',
                          })}
                        </h2>
                        <span
                          onClick={() => {
                            setSelectedDateStr(null);
                            setStatusFilter('SEMUA_BULAN');
                          }}
                          className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold cursor-pointer transition-all hover:scale-105 shadow-xs"
                          style={{
                            backgroundColor:
                              statusFilter === 'SEMUA_BULAN'
                                ? 'rgba(41, 128, 185, 0.35)'
                                : 'rgba(255, 255, 255, 0.12)',
                            color: textSecondaryColor,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                          }}
                          title={`Terdapat total ${ringkasanBulanIni.totalEventBulanIni} item jadwal di bulan ${currentCalendarDate.toLocaleDateString('id-ID', { month: 'long' })}`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                          <span>{ringkasanBulanIni.totalEventBulanIni} Event</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentCalendarDate(
                            new Date(
                              currentCalendarDate.getFullYear(),
                              currentCalendarDate.getMonth() + 1,
                              1
                            )
                          )
                        }
                        className="p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                        style={{ color: textPrimaryColor }}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Header Nama Hari */}
                    <div className="grid grid-cols-7 gap-0.5 text-center mb-1.5">
                      {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((hari, idx) => (
                        <div
                          key={hari}
                          className={`font-bold py-0.5 ${
                            isMobileLayout ? 'text-[11px]' : 'text-xs'
                          }`}
                          style={{
                            color: idx === 0 ? '#E74C3C' : textSecondaryColor,
                          }}
                        >
                          {hari}
                        </div>
                      ))}
                    </div>

                    {/* Grid Tanggal Kalender (Rapat di HP, Proporsional & Nyaman di PC) */}
                    <div
                      className={
                        isMobileLayout
                          ? 'grid grid-cols-7 gap-y-0.5 gap-x-1 place-items-center'
                          : 'grid grid-cols-7 gap-y-1.5 gap-x-1.5 place-items-center'
                      }
                    >
                      {calendarDays.map((cell, idx) => {
                        const cellSizeClass = isMobileLayout
                          ? 'w-8 h-8 sm:w-9 sm:h-9'
                          : 'w-10 h-10';

                        if (!cell.dayNumber || !cell.dateKey) {
                          return <div key={`empty-${idx}`} className={cellSizeClass} />;
                        }

                        const isSelected =
                          selectedDateStr === cell.dateKey && statusFilter === 'TANGGAL_DIPILIH';

                        const hasWeb = cell.events.some((e) => isUnconfirmedWebBooking(e));

                        const officialEvents = cell.events.filter((e) => {
                          const st = (e.status || '').trim().toLowerCase();
                          return !isUnconfirmedWebBooking(e) && st !== 'dibatalkan';
                        });

                        const hasLunas = officialEvents.some(
                          (e) => (e.status || '').trim().toLowerCase() === 'lunas'
                        );
                        const hasSudahDp = officialEvents.some((e) => {
                          const st = (e.status || '').trim().toLowerCase();
                          if (st === 'lunas') return false;
                          return st === 'dp' || st === 'sudah dp' || (e.dpDibayar || 0) > 0;
                        });
                        const hasBookingBaru = officialEvents.some((e) => {
                          const st = (e.status || '').trim().toLowerCase();
                          if (st === 'lunas') return false;
                          const sudahDp =
                            st === 'dp' || st === 'sudah dp' || (e.dpDibayar || 0) > 0;
                          return !sudahDp;
                        });

                        return (
                          <button
                            key={cell.dateKey}
                            type="button"
                            onClick={() => {
                              setSelectedDateStr(cell.dateKey);
                              setStatusFilter('TANGGAL_DIPILIH');
                              bumpCacheHit();
                            }}
                            className={`relative ${cellSizeClass} rounded-full flex items-center justify-center transition-transform hover:scale-105 cursor-pointer`}
                            style={{
                              backgroundColor: isSelected
                                ? '#2980B9'
                                : cell.isToday
                                ? 'rgba(255, 255, 255, 0.2)'
                                : 'transparent',
                            }}
                            title={
                              cell.events.length > 0
                                ? `${cell.events.length} Jadwal pada tanggal ${cell.dayNumber}`
                                : `Tanggal ${cell.dayNumber}`
                            }
                          >
                            {/* 1. Lingkaran Coretan Tangan Oranye (#F39C12) - Booking (Belum DP) */}
                            {hasBookingBaru && (
                              <svg
                                viewBox="0 0 24 24"
                                className="absolute inset-0 w-full h-full pointer-events-none"
                              >
                                <path
                                  stroke="#F39C12"
                                  strokeWidth="1.2"
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11.5,3.5 C16,2.5 21.5,6 21,12.5 C20.5,19 14.5,21.5 9,20.5 C3.5,19.5 2.5,13 4,8.5 C5.5,4 9.5,3 12.5,4"
                                />
                              </svg>
                            )}

                            {/* 2. Lingkaran Kaligrafi Merah (#E74C3C) - Sudah DP (Belum Lunas) */}
                            {hasSudahDp && (
                              <svg
                                viewBox="0 0 24 24"
                                className="absolute inset-0 w-full h-full pointer-events-none"
                              >
                                <path
                                  fill="#E74C3C"
                                  d="M 12,2 C 18,2 23,7 23,13 C 23,19 18,23 12,23 C 6,23 2,19 2,13 C 2,8 5,4 10,3 C 15,2 19,5 19,10 C 19,15 15,19 10,19 C 8,19 6,18 4,16 C 6,17 7,18 10,18 C 14,18 18,14 18,10 C 18,6 14,3.5 10,4.5 C 6,5.5 3,9 3,13 C 3,18 7,22 12,22 C 17,22 22,18 22,13 C 22,8 17,3 12,2 Z"
                                />
                              </svg>
                            )}

                            {/* 3. Lingkaran Kaligrafi Hijau (#27AE60) - Lunas */}
                            {hasLunas && !hasSudahDp && !hasBookingBaru && (
                              <svg
                                viewBox="0 0 24 24"
                                className="absolute inset-0 w-full h-full pointer-events-none"
                              >
                                <path
                                  fill="#27AE60"
                                  d="M 12,2 C 18,2 23,7 23,13 C 23,19 18,23 12,23 C 6,23 2,19 2,13 C 2,8 5,4 10,3 C 15,2 19,5 19,10 C 19,15 15,19 10,19 C 8,19 6,18 4,16 C 6,17 7,18 10,18 C 14,18 18,14 18,10 C 18,6 14,3.5 10,4.5 C 6,5.5 3,9 3,13 C 3,18 7,22 12,22 C 17,22 22,18 22,13 C 22,8 17,3 12,2 Z"
                                />
                              </svg>
                            )}

                            {/* 4. Huruf W Presisi Kuning Emas (#FFCE1b) di Pojok Kiri Atas - Pesanan Web */}
                            {hasWeb && (
                              <svg
                                viewBox="0 0 24 24"
                                className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 z-20 pointer-events-none drop-shadow"
                              >
                                <path
                                  fill="#FFCE1b"
                                  stroke="#000000"
                                  strokeWidth="0.3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M 3,5 L 8,19 L 12,12 L 16,19 L 21,5 L 17,5 L 14,14 L 12,10 L 10,14 L 7,5 Z"
                                />
                              </svg>
                            )}

                            {/* Angka Tanggal */}
                            <span
                              className={`relative z-10 font-bold ${
                                isMobileLayout ? 'text-xs' : 'text-sm'
                              }`}
                              style={{
                                color: isSelected ? '#FFFFFF' : textPrimaryColor,
                              }}
                            >
                              {cell.dayNumber}
                            </span>

                            {/* Badge Jumlah Event jika lebih dari 1 */}
                            {cell.events.length > 1 && (
                              <span
                                className="absolute -bottom-0.5 -right-0.5 z-20 min-w-3.5 h-3.5 px-0.5 rounded-full bg-sky-600 text-white font-black text-[8.5px] flex items-center justify-center shadow-xs pointer-events-none border border-slate-900"
                                title={`${cell.events.length} Jadwal`}
                              >
                                {cell.events.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Keterangan Indikator Tanggal SVG APK: Booking Web • Booking • Sudah DP • Lunas (Interaktif & Bisa Diklik untuk Filter) */}
                    <div
                      className="mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-1.5 text-[10px] sm:text-[11px]"
                      style={{
                        borderColor: isKacaGelap ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: textSecondaryColor,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (statusFilter === 'BOOKING_WEB') {
                            setStatusFilter('SEMUA_BULAN');
                            setSelectedDateStr(null);
                          } else {
                            setStatusFilter('BOOKING_WEB');
                            setSelectedDateStr(null);
                          }
                          bumpCacheHit();
                        }}
                        className={`flex items-center gap-1 cursor-pointer transition-all px-0.5 py-0.5 rounded ${
                          statusFilter === 'BOOKING_WEB'
                            ? 'font-bold bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/50'
                            : 'hover:opacity-80 hover:bg-white/5'
                        }`}
                        title="Klik untuk memfilter pesanan form booking web"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0">
                          <path
                            fill="#FFCE1b"
                            stroke="#000000"
                            strokeWidth="0.3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M 3,5 L 8,19 L 12,12 L 16,19 L 21,5 L 17,5 L 14,14 L 12,10 L 10,14 L 7,5 Z"
                          />
                        </svg>
                        <span>Web ({listPesananWebMenunggu.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (statusFilter === 'BOOKING_BARU') {
                            setStatusFilter('SEMUA_BULAN');
                            setSelectedDateStr(null);
                          } else {
                            setStatusFilter('BOOKING_BARU');
                            setSelectedDateStr(null);
                          }
                          bumpCacheHit();
                        }}
                        className={`flex items-center gap-1 cursor-pointer transition-all px-0.5 py-0.5 rounded ${
                          statusFilter === 'BOOKING_BARU'
                            ? 'font-bold bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/50'
                            : 'hover:opacity-80 hover:bg-white/5'
                        }`}
                        title="Klik untuk memfilter jadwal Booking"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0">
                          <path
                            stroke="#F39C12"
                            strokeWidth="1.6"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M11.5,3.5 C16,2.5 21.5,6 21,12.5 C20.5,19 14.5,21.5 9,20.5 C3.5,19.5 2.5,13 4,8.5 C5.5,4 9.5,3 12.5,4"
                          />
                        </svg>
                        <span>Booking ({ringkasanBulanIni.jmlBookingBaru})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (statusFilter === 'SUDAH_DP') {
                            setStatusFilter('SEMUA_BULAN');
                            setSelectedDateStr(null);
                          } else {
                            setStatusFilter('SUDAH_DP');
                            setSelectedDateStr(null);
                          }
                          bumpCacheHit();
                        }}
                        className={`flex items-center gap-1 cursor-pointer transition-all px-0.5 py-0.5 rounded ${
                          statusFilter === 'SUDAH_DP'
                            ? 'font-bold bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/50'
                            : 'hover:opacity-80 hover:bg-white/5'
                        }`}
                        title="Klik untuk memfilter jadwal Sudah DP"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0">
                          <path
                            fill="#E74C3C"
                            d="M 12,2 C 18,2 23,7 23,13 C 23,19 18,23 12,23 C 6,23 2,19 2,13 C 2,8 5,4 10,3 C 15,2 19,5 19,10 C 19,15 15,19 10,19 C 8,19 6,18 4,16 C 6,17 7,18 10,18 C 14,18 18,14 18,10 C 18,6 14,3.5 10,4.5 C 6,5.5 3,9 3,13 C 3,18 7,22 12,22 C 17,22 22,18 22,13 C 22,8 17,3 12,2 Z"
                          />
                        </svg>
                        <span>Sudah Dp ({ringkasanBulanIni.jmlSudahDp})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (statusFilter === 'LUNAS') {
                            setStatusFilter('SEMUA_BULAN');
                            setSelectedDateStr(null);
                          } else {
                            setStatusFilter('LUNAS');
                            setSelectedDateStr(null);
                          }
                          bumpCacheHit();
                        }}
                        className={`flex items-center gap-1 cursor-pointer transition-all px-0.5 py-0.5 rounded ${
                          statusFilter === 'LUNAS'
                            ? 'font-bold bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/50'
                            : 'hover:opacity-80 hover:bg-white/5'
                        }`}
                        title="Klik untuk memfilter jadwal Lunas"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0">
                          <path
                            fill="#27AE60"
                            d="M 12,2 C 18,2 23,7 23,13 C 23,19 18,23 12,23 C 6,23 2,19 2,13 C 2,8 5,4 10,3 C 15,2 19,5 19,10 C 19,15 15,19 10,19 C 8,19 6,18 4,16 C 6,17 7,18 10,18 C 14,18 18,14 18,10 C 18,6 14,3.5 10,4.5 C 6,5.5 3,9 3,13 C 3,18 7,22 12,22 C 17,22 22,18 22,13 C 22,8 17,3 12,2 Z"
                          />
                        </svg>
                        <span>Lunas ({ringkasanBulanIni.jmlLunas})</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* KHUSUS LAYAR PC: 4 Kartu Statistik Bulan Ini di Bawah Kalender */}
                {!isMobileLayout && (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(null);
                        setStatusFilter('SEMUA_BULAN');
                      }}
                      className="rounded-xl p-3.5 border text-left transition-transform hover:scale-[1.01] cursor-pointer shadow-md"
                      style={cardBgStyle}
                    >
                      <p className="text-[11px] font-bold" style={{ color: textSecondaryColor }}>
                        Total Event Bulan Ini
                      </p>
                      <p className="text-xl font-black mt-0.5 text-[#64B5F6]">
                        {ringkasanBulanIni.totalEventBulanIni} Jadwal
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(null);
                        setStatusFilter('LUNAS');
                      }}
                      className="rounded-xl p-3.5 border text-left transition-transform hover:scale-[1.01] cursor-pointer shadow-md"
                      style={cardBgStyle}
                    >
                      <p className="text-[11px] font-bold" style={{ color: textSecondaryColor }}>
                        Sudah Lunas
                      </p>
                      <p className="text-xl font-black mt-0.5 text-[#2ECC71]">
                        {ringkasanBulanIni.jmlLunas} Jadwal
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(null);
                        setStatusFilter('SUDAH_DP');
                      }}
                      className="rounded-xl p-3.5 border text-left transition-transform hover:scale-[1.01] cursor-pointer shadow-md"
                      style={cardBgStyle}
                    >
                      <p className="text-[11px] font-bold" style={{ color: textSecondaryColor }}>
                        Sudah DP (Belum Lunas)
                      </p>
                      <p className="text-xl font-black mt-0.5 text-[#E74C3C]">
                        {ringkasanBulanIni.jmlSudahDp} Jadwal
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDateStr(null);
                        setStatusFilter('BOOKING_BARU');
                      }}
                      className="rounded-xl p-3.5 border text-left transition-transform hover:scale-[1.01] cursor-pointer shadow-md"
                      style={cardBgStyle}
                    >
                      <p className="text-[11px] font-bold" style={{ color: textSecondaryColor }}>
                        Booking (Belum DP)
                      </p>
                      <p className="text-xl font-black mt-0.5 text-[#F39C12]">
                        {ringkasanBulanIni.jmlBookingBaru} Jadwal
                      </p>
                    </button>
                  </div>
                )}
              </div>

              {/* ============================================================= */}
              {/* KOLOM KANAN: DAFTAR JADWAL (DI BAWAH SAAT HP, DI KANAN SAAT PC) */}
              {/* ============================================================= */}
              <div
                className={
                  isMobileLayout
                    ? 'space-y-2.5'
                    : 'col-span-7 rounded-2xl p-5 border shadow-2xl backdrop-blur-md space-y-4'
                }
                style={isMobileLayout ? undefined : cardBgStyle}
              >
                {/* Judul Tanggal (Misal: "5 Oktober 2026") digeser sedikit ke dalam saat di HP */}
                <div
                  className={`flex flex-wrap items-center justify-between gap-2 ${
                    isMobileLayout ? 'px-2.5' : 'pb-3 border-b border-white/10'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2
                      className="font-extrabold capitalize"
                      style={{
                        fontSize: isMobileLayout ? '15px' : '18px',
                        color: isMobileLayout ? '#FFFFFF' : textPrimaryColor,
                        textShadow: isMobileLayout ? '1px 1px 3px rgba(0,0,0,0.8)' : undefined,
                      }}
                    >
                      {formatJudulTanggalPilihan(selectedDateStr)}
                    </h2>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold shadow-xs"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.16)',
                        color: isMobileLayout ? '#FFFFFF' : textPrimaryColor,
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                      }}
                      title={`Terdapat ${filteredScheduleList.length} item jadwal pada tampilan ini`}
                    >
                      {filteredScheduleList.length} Item
                    </span>

                    {/* Spam button removed as requested */}
                  </div>

                  {!isKruAnggota && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingJadwal(null);
                        setFormModalMode('TAMBAH_AGENDA');
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-extrabold text-white flex items-center gap-1.5 shadow cursor-pointer"
                      style={{ backgroundColor: '#2980B9' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Jadwal Baru</span>
                    </button>
                  )}
                </div>

             

                {/* Panel Khusus Pesanan Form Web yang Belum Dikonfirmasi (Hanya untuk Owner & Admin) */}
                {!isKruAnggota && pesananWebPadaTanggalDipilih.length > 0 && (
                  <div
                    className="rounded-[12px] p-3.5 border shadow-lg space-y-2.5"
                    style={{
                      backgroundColor: '#2C3E50',
                      borderColor: '#FFCE1b',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0">
                        <path
                          fill="#FFCE1b"
                          stroke="#000000"
                          strokeWidth="0.3"
                          d="M 3,5 L 8,19 L 12,12 L 16,19 L 21,5 L 17,5 L 14,14 L 12,10 L 10,14 L 7,5 Z"
                        />
                      </svg>
                      <div>
                        <p className="text-xs font-extrabold text-[#FFCE1b]">
                          Form Booking Web
                        </p>
                        <p className="text-[11px] text-slate-300">
                          Konfirmasikan pesanan di bawah ini
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {pesananWebPadaTanggalDipilih.map((webItem) => (
                        <div
                          key={webItem.idJadwal}
                          className="rounded-xl p-3 bg-black/30 border border-white/10 flex flex-wrap items-center justify-between gap-2.5"
                        >
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-white">
                              {statusFilter === 'BOOKING_WEB'
                                ? `${formatTanggalIndo(webItem.tanggalMulai || webItem.waktuMulai)} • `
                                : ''}
                              {webItem.namaAcara} — {webItem.namaKlien} ({webItem.waPic || '-'})
                            </p>
                            <p className="text-xs text-[#64B5F6] font-bold mt-0.5">
                              {webItem.paket} ({keRupiah(webItem.hargaKotor)}) • {webItem.lokasi}
                            </p>
                            {webItem.catatan && (
                              <p className="text-[11px] text-amber-200 mt-1 italic">
                                "{webItem.catatan}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setWebConfirmTarget(webItem);
                                setWebConfirmDpStr('');
                                setWebConfirmExtraName('');
                                setWebConfirmExtraStr('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white cursor-pointer"
                              style={{ backgroundColor: '#27AE60' }}
                            >
                              ✅ Konfirmasikan
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDeleteJadwal(webItem.idJadwal);
                                setToastMessage('⚠️ Pesanan web telah ditolak dan dihapus dari sistem.');
                                setTimeout(() => setToastMessage(null), 3500);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-extrabold text-white cursor-pointer"
                              style={{ backgroundColor: '#E74C3C' }}
                            >
                              ❌ Tolak / Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daftar Kartu Jadwal Resmi */}
                {statusFilter === 'BOOKING_WEB' ? (
                  pesananWebPadaTanggalDipilih.length === 0 ? (
                    <div
                      className={`rounded-[12px] text-center border backdrop-blur-md ${
                        isMobileLayout ? 'py-5 px-4' : 'py-12 px-6 bg-black/20 border-white/10'
                      }`}
                      style={isMobileLayout ? cardBgStyle : undefined}
                    >
                      <p className="font-bold text-xs sm:text-sm" style={{ color: textPrimaryColor }}>
                        Tidak ada pesanan Web menunggu konfirmasi
                      </p>
                    </div>
                  ) : null
                ) : filteredScheduleList.length === 0 ? (
                  <div
                    className={`rounded-[12px] text-center border backdrop-blur-md ${
                      isMobileLayout
                        ? 'py-5 px-4'
                        : 'py-14 px-6 bg-black/20 border-white/10 flex flex-col items-center justify-center space-y-3'
                    }`}
                    style={isMobileLayout ? cardBgStyle : undefined}
                  >
                    <p className="font-bold text-xs sm:text-sm" style={{ color: textPrimaryColor }}>
                      {statusFilter === 'TANGGAL_DIPILIH'
                        ? 'Tidak ada event di tanggal ini'
                        : 'Tidak ada event di bulan ini'}
                    </p>
                    {!isMobileLayout && (
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                        {!isKruAnggota && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingJadwal(null);
                              setFormModalMode('TAMBAH_AGENDA');
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-[#2980B9] hover:opacity-95 shadow cursor-pointer flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Tambah Event di Tanggal Ini</span>
                          </button>
                        )}
                        {ringkasanBulanIni.totalEventBulanIni > 0 &&
                          statusFilter === 'TANGGAL_DIPILIH' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDateStr(null);
                                setStatusFilter('SEMUA_BULAN');
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/15 border border-white/15 cursor-pointer"
                            >
                              Event Bulan Ini ({ringkasanBulanIni.totalEventBulanIni} Item)
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={
                      isMobileLayout
                        ? 'space-y-2'
                        : 'space-y-3 max-h-[68vh] overflow-y-auto pr-1'
                    }
                  >
                    {filteredScheduleList.map((item) => {
                      const stLower = item.status.toLowerCase();
                      const isSudahDp =
                        stLower !== 'lunas' &&
                        stLower !== 'dibatalkan' &&
                        (stLower === 'dp' || stLower === 'sudah dp' || (item.dpDibayar || 0) > 0);

                      const statusStripColor =
                        stLower === 'lunas'
                          ? '#27AE60'
                          : stLower === 'dibatalkan'
                          ? '#7F8C8D'
                          : isSudahDp
                          ? '#E74C3C'
                          : '#F39C12';

                      const statusBadgeLabel =
                        stLower === 'lunas'
                          ? 'LUNAS'
                          : isSudahDp
                          ? 'SUDAH DP'
                          : 'BOOKING';

                      const totalBersih = Math.max(0, item.hargaKotor - item.diskon);
                      const sisaTagihan = Math.max(0, totalBersih - item.dpDibayar);

                      return (
                        <div
                          key={item.idJadwal}
                          onClick={() => setAksiJadwalTarget(item)}
                          className="rounded-[11px] overflow-hidden shadow-md border flex cursor-pointer transition-all hover:scale-[1.005] backdrop-blur-md"
                          style={
                            isMobileLayout
                              ? cardBgStyle
                              : isKacaGelap
                              ? {
                                  backgroundColor: `rgba(12, 16, 24, ${Math.max(0.28, cardOpacity - 0.2)})`,
                                  borderColor: 'rgba(255, 255, 255, 0.12)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                }
                              : {
                                  backgroundColor: `rgba(255, 255, 255, ${Math.max(0.4, cardOpacity - 0.15)})`,
                                  borderColor: 'rgba(0, 0, 0, 0.08)',
                                  backdropFilter: 'blur(12px)',
                                  WebkitBackdropFilter: 'blur(12px)',
                                }
                          }
                        >
                          {/* Garis Status Kiri */}
                          <div
                            className="w-[6px] shrink-0"
                            style={{ backgroundColor: statusStripColor }}
                          />

                       {/* Isi Kartu Jadwal */}
<div className={isMobileLayout ? 'flex-1 px-3 py-2.5' : 'flex-1 px-4 py-3.5'}>
  
  {/* Baris Tanggal di Atas (jika bukan filter tanggal terpilih) */}
  {statusFilter !== 'TANGGAL_DIPILIH' && (item.tanggalMulai || item.waktuMulai) && (
    <div 
      className="mb-1 font-medium tracking-wide"
      style={{
        fontSize: isMobileLayout ? '10.5px' : '11.5px',
        color: textSecondaryColor,
        opacity: 0.85
      }}
    >
      📅 {formatTanggalIndo(item.tanggalMulai || item.waktuMulai)}
    </div>
  )}

  {/* Baris Atas: Jam + Nama Acara & Badge Status */}
  <div className="flex items-start justify-between gap-2">
    <h3
      className="font-bold leading-snug"
      style={{
        fontSize: isMobileLayout ? '13.5px' : '15px',
        color: textPrimaryColor,
      }}
    >
      {formatJamWIB(item.waktuMulai)} — {item.namaAcara}
    </h3>

    <span
      className="px-2.5 py-0.5 rounded font-bold uppercase shrink-0"
      style={{
        fontSize: isMobileLayout ? '10px' : '11px',
        backgroundColor: isKacaGelap
          ? 'rgba(255,255,255,0.1)'
          : '#ECF0F1',
        color: statusStripColor,
      }}
    >
      {statusBadgeLabel}
    </span>
  </div>

  {/* Nama Klien & WA */}
  <p
    className="mt-1 leading-snug"
    style={{
      fontSize: isMobileLayout ? '12px' : '13px',
      color: textSecondaryColor,
    }}
  >
    <span>{item.namaKlien}</span>
    <span 
      className="inline-block ml-1.5 opacity-80"
      style={{ fontSize: isMobileLayout ? '10.5px' : '11.5px' }}
    >
      ({item.waPic || '-'})
    </span>
  </p>

  {/* Paket */}
  <p
    className="mt-0.5 font-bold leading-snug"
    style={{
      fontSize: isMobileLayout ? '12px' : '13px',
      color: '#64B5F6',
    }}
  >
    {item.paket || '-'}
    {item.namaTambahan ? ` + ${item.namaTambahan}` : ''}
  </p>

  {/* Lokasi */}
  <p
    className="mt-0.5 leading-snug inline-flex items-center gap-1"
    style={{
      fontSize: isMobileLayout ? '11.5px' : '12.5px',
      color: textSecondaryColor,
    }}
  >
    <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: textSecondaryColor }} />
    <span>{item.lokasi || 'Studio'}</span>
  </p>

  {/* Catatan di Bawah Alamat */}
  {Boolean(item.catatan && item.catatan.trim()) && (
    <p
      className="mt-1 leading-snug flex items-start gap-1.5"
      style={{
        fontSize: isMobileLayout ? '11px' : '12px',
        color: isKacaGelap ? '#FDE047' : '#B45309',
      }}
    >
      <span className="italic font-medium">{item.catatan}</span>
    </p>
  )}

  {/* Garis Pemisah & Baris Harga */}
  {!isKruAnggota && (
    <>
      <div
        className="my-2 h-px"
        style={{
          backgroundColor: isKacaGelap
            ? 'rgba(255,255,255,0.12)'
            : '#EEEEEE',
        }}
      />
      <div className="flex items-center justify-between text-xs sm:text-sm font-bold">
        <span style={{ color: textPrimaryColor }}>
          Total: {keRupiah(totalBersih)}
        </span>
        <span
          style={{
            color:
              sisaTagihan <= 0 || stLower === 'lunas'
                ? '#27AE60'
                : '#E74C3C',
          }}
        >
          {sisaTagihan <= 0 || stLower === 'lunas'
            ? ''
            : `Sisa: ${keRupiah(sisaTagihan)}`}
        </span>
      </div>
    </>
  )}
</div>
                        </div>
                      );
                    })}
                  </div>
                )}

             
              </div>
            </div>
          </div>
        )}

        {/* TAB MANAJEMEN LAINNYA */}
        <Suspense
          fallback={
            <div className="p-8 text-center text-xs text-slate-400">Memuat halaman...</div>
          }
        >
        {activeTab === 'LAPORAN' && !isKruAnggota && (
          <LaporanKeuanganView
            jadwalAktif={jadwalAktif}
            onSelectJadwal={(j) => setAksiJadwalTarget(j)}
            userRole={userRole}
          />
        )}

        {activeTab === 'ARSIP' && !isKruAnggota && (
          <ArsipPencarianView
            jadwalAktif={jadwalAktif}
            jadwalArsip={jadwalArsip}
            onSelectAktif={(j) => setAksiJadwalTarget(j)}
            onRestoreFromArsip={async (j) => {
              setJadwalArsip((prev) => prev.filter((x) => x.idJadwal !== j.idJadwal));
              setJadwalAktif((prev) => [{ ...j, isFromArchive: false }, ...prev]);
              if (sessionMode === 'FIREBASE') {
                await restoreArsipToFirebase(targetOwnerId, j);
              }
            }}
          />
        )}

        {activeTab === 'PAKET' && !isKruAnggota && (
          <MasterPaketView
            paketList={paketList}
            onSavePaket={async (p) => {
              setPaketList((prev) => {
                const exists = prev.some((x) => x.idPaket === p.idPaket);
                if (exists) return prev.map((x) => (x.idPaket === p.idPaket ? p : x));
                return [...prev, p];
              });
              if (sessionMode === 'FIREBASE') {
                await savePaketToFirebase(targetOwnerId, p);
              }
            }}
            onDeletePaket={async (idPaket) => {
              setPaketList((prev) => prev.filter((x) => x.idPaket !== idPaket));
              if (sessionMode === 'FIREBASE') {
                await deletePaketFromFirebase(targetOwnerId, idPaket);
              }
            }}
            onMoveOrder={async (idx, direction) => {
              const targetIdx = idx + direction;
              if (targetIdx < 0 || targetIdx >= paketList.length) return;
              const copy = [...paketList];
              const temp = copy[idx];
              copy[idx] = copy[targetIdx];
              copy[targetIdx] = temp;
              const reordered = copy.map((item, i) => ({ ...item, urutan: i }));
              setPaketList(reordered);
              if (sessionMode === 'FIREBASE') {
                for (const p of reordered) {
                  await savePaketToFirebase(targetOwnerId, p);
                }
              }
            }}
          />
        )}

        {activeTab === 'PELANGGAN' && !isKruAnggota && (
          <DaftarPelangganView
            pelangganList={pelangganList}
            onSavePelanggan={handleSavePelanggan}
            onDeletePelanggan={handleDeletePelanggan}
          />
        )}

        {activeTab === 'TIM' && !isKruAnggota && getLimits(owner.paketAktif).canManageTeam && (
          <KelolaTimView
            timList={timList}
            namaBrand={owner.namaBrand}
            ownerUid={targetOwnerId}
            paketAktif={owner.paketAktif}
            onAddTim={async (anggota) => {
              setTimList((prev) => [...prev, anggota]);
              setQuotaStats((prev) => ({ ...prev, writesSession: prev.writesSession + 1 }));
              if (sessionMode === 'FIREBASE') {
                await saveTimToFirebase(targetOwnerId, anggota);
              }
            }}
            onRemoveTim={async (uid) => {
              setTimList((prev) => prev.filter((x) => x.uid !== uid));
              setQuotaStats((prev) => ({ ...prev, writesSession: prev.writesSession + 1 }));
              if (sessionMode === 'FIREBASE') {
                await deleteTimFromFirebase(targetOwnerId, uid);
              }
            }}
          />
        )}
        {activeTab === 'TIM' && !isKruAnggota && !getLimits(owner.paketAktif).canManageTeam && (
          <div className="p-8 text-center text-slate-500 text-xs">
            Fitur Kelola Tim tidak tersedia pada paket Standar. Silakan upgrade ke paket Pro atau Ultimate.
          </div>
        )}

        {activeTab === 'PENGATURAN' && !isKruAnggota && (
          <PengaturanStudioView
            owner={owner}
            rekening={rekening}
            initialSubTab={pengaturanSubTab}
            onUpdateOwner={async (updates) => {
              // Jika paket Standar, blokir perubahan tema
              if (owner.paketAktif === 'Starter' && updates.temaWeb) {
                return;
              }
              setOwner((prev) => ({ ...prev, ...updates }));
              if (sessionMode === 'FIREBASE') {
                await saveOwnerProfileToFirebase(targetOwnerId, updates);
              }
            }}
            onUpdateRekening={async (rek) => {
              setRekening(rek);
              if (sessionMode === 'FIREBASE') {
                await saveRekeningToFirebase(targetOwnerId, rek);
              }
            }}
            onOpenSignatureModal={() => setSignatureModalOpen(true)}
          />
        )}
        </Suspense>
      </main>
      </div>

      {/* ===================================================================== */}
      {/* NAVIGATION BAR DI BAWAH (BOTTOM NAVIGATION BAR)                       */}
      {/* Otomatis berubah dinamis mengikuti Warna Tema & Background Wallpaper  */}
      {/* ===================================================================== */}
      {isMobileLayout && (
        <nav
          aria-label="Navigation Bar Bawah"
          className="fixed bottom-0 left-0 right-0 z-40 border-t transition-all duration-300 shadow-2xl flex items-center justify-around px-1.5 py-1 select-none"
          style={{
            ...navBackgroundComputed,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)',
          }}
        >
          {/* 1. KALENDER */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('KALENDER');
              setSelectedDateStr(null);
              setStatusFilter('SEMUA_BULAN');
              bumpCacheHit();
            }}
            className="flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative"
            style={{
              color: activeTab === 'KALENDER' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
              backgroundColor: activeTab === 'KALENDER' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
              border: activeTab === 'KALENDER' ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
            }}
          >
            <CalendarIcon className="w-5 h-5 shrink-0" />
            <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">Kalender</span>
            {activeTab === 'KALENDER' && (
              <span
                className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: '#F39C12' }}
              />
            )}
          </button>

          {/* 2. LAPORAN */}
          {!isKruAnggota && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('LAPORAN');
                bumpCacheHit();
              }}
              className="flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative"
              style={{
                color: activeTab === 'LAPORAN' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                backgroundColor: activeTab === 'LAPORAN' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                border: activeTab === 'LAPORAN' ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
              }}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">Laporan</span>
              {activeTab === 'LAPORAN' && (
                <span
                  className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#F39C12' }}
                />
              )}
            </button>
          )}



          {/* 3. TAMBAH TRANSAKSI */}

          {/* 3. TAMBAH TRANSAKSI */}
          {!isKruAnggota && (
            <button
              type="button"
              onClick={() => {
                setEditingJadwal(null);
                setFabChoiceOpen(true);
              }}
              className="flex flex-col items-center justify-center flex-1 rounded-xl transition-all cursor-pointer relative group -top-3"
              title="Kasir Cepat & Tambah Transaksi"
            >
              <div
                className="w-14 h-12 rounded-full flex items-center justify-center text-white shadow-lg border-1 border-white transition-transform group-hover:scale-110 active:scale-95"
                style={{ backgroundColor: navThemeColor }}
              >
                <Plus className="w-6 h-6 stroke-[2.8]" />
              </div>

            </button>
          )}


          {/* 4. LAYANAN (MEMBUKA JENIS LAYANAN / PAKET) */}
          {!isKruAnggota && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('PAKET');
                bumpCacheHit();
              }}
              className="flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative"
              style={{
                color: activeTab === 'PAKET' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                backgroundColor: activeTab === 'PAKET' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                border: activeTab === 'PAKET' ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
              }}
              title="Layanan & Jenis Layanan"
            >
              <Layers className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">Layanan</span>
              {activeTab === 'PAKET' && (
                <span
                  className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#F39C12' }}
                />
              )}
            </button>
          )}

          {/* 5. ARSIP */}
          {!isKruAnggota && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('ARSIP');
                bumpCacheHit();
              }}
              className="flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-xl transition-all cursor-pointer relative"
              style={{
                color: activeTab === 'ARSIP' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                backgroundColor: activeTab === 'ARSIP' ? 'rgba(255, 255, 255, 0.18)' : 'transparent',
                border: activeTab === 'ARSIP' ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
              }}
            >
              <Archive className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-bold mt-0.5 tracking-tight truncate max-w-full">Arsip</span>
              {activeTab === 'ARSIP' && (
                <span
                  className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: '#F39C12' }}
                />
              )}
            </button>
          )}
        </nav>
      )}

      {/* ===================================================================== */}
      {/* POPUP MENU AKSI JADWAL PERSIS dialog_aksi_jadwal.xml APK ANDROID      */}
      {/* ===================================================================== */}
      {aksiJadwalTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setAksiJadwalTarget(null)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl p-6 shadow-2xl space-y-3"
            style={{ backgroundColor: '#FFFFFF', color: '#2C3E50' }}
            onClick={(e) => e.stopPropagation()}
          >
            {isKruAnggota ? (
              <>
                <div className="text-center pb-2 border-b border-slate-100">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-100 text-blue-700 uppercase">
                    Detail Penugasan Crew
                  </span>
                  <h3 className="text-lg font-black mt-2 text-slate-900 leading-snug">
                    {aksiJadwalTarget.namaAcara}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Klien: {aksiJadwalTarget.namaKlien}
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-200">
                    <p className="font-bold text-slate-700 flex items-center gap-2">
                      📅 <span className="text-slate-900">{formatTanggalIndo(aksiJadwalTarget.tanggalMulai || aksiJadwalTarget.waktuMulai)}</span>
                    </p>
                    <p className="font-bold text-slate-700 flex items-center gap-2">
                      ⏰ <span className="text-slate-900">{formatJamWIB(aksiJadwalTarget.waktuMulai)} - {aksiJadwalTarget.waktuSelesai ? formatJamWIB(aksiJadwalTarget.waktuSelesai) : 'Selesai'}</span>
                    </p>
                    <p className="font-bold text-slate-700 flex items-center gap-2">
                      📍 <span className="text-slate-900">{aksiJadwalTarget.lokasi || 'Studio'}</span>
                    </p>
                    <p className="font-bold text-slate-700 flex items-center gap-2">
                      📦 <span className="text-slate-900">{aksiJadwalTarget.paket || '-'} {aksiJadwalTarget.namaTambahan ? `+ ${aksiJadwalTarget.namaTambahan}` : ''}</span>
                    </p>
                  </div>

                  {aksiJadwalTarget.attire && (
                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900">
                      <span className="font-bold">👔 Attire / Kostum:</span>{' '}
                      {[
                        aksiJadwalTarget.attire.cpwModel && `CPW: ${aksiJadwalTarget.attire.cpwModel} (${aksiJadwalTarget.attire.cpwUkuran || '-'})`,
                        aksiJadwalTarget.attire.cppModel && `CPP: ${aksiJadwalTarget.attire.cppModel} (${aksiJadwalTarget.attire.cppUkuran || '-'})`,
                        aksiJadwalTarget.attire.catatanAttire,
                      ].filter(Boolean).join(' | ') || 'Tersedia'}
                    </div>
                  )}

                  {aksiJadwalTarget.fotoTeknis && (
                    <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900">
                      <span className="font-bold">📷 Catatan Teknis Foto:</span>{' '}
                      {[
                        aksiJadwalTarget.fotoTeknis.jmlShooter && `Shooter: ${aksiJadwalTarget.fotoTeknis.jmlShooter}`,
                        aksiJadwalTarget.fotoTeknis.droneLighting && `Drone/Lighting: ${aksiJadwalTarget.fotoTeknis.droneLighting}`,
                        aksiJadwalTarget.fotoTeknis.namaKru && `Crew: ${aksiJadwalTarget.fotoTeknis.namaKru}`,
                      ].filter(Boolean).join(' | ') || 'Tersedia'}
                    </div>
                  )}

                  {aksiJadwalTarget.catatan && (
                    <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700">
                      <span className="font-bold">Catatan: </span> {aksiJadwalTarget.catatan}
                    </div>
                  )}
                </div>

                <div className="pt-2 space-y-2">
    
                  <button
                    type="button"
                    onClick={() => setAksiJadwalTarget(null)}
                    className="w-full py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3
                  className="text-center font-bold"
                  style={{ fontSize: '18px', color: '#2C3E50' }}
                >
                  Menu Aksi Jadwal
                </h3>
                <p
                  className="text-center pb-3"
                  style={{ fontSize: '14px', color: '#7F8C8D' }}
                >
                  {aksiJadwalTarget.namaAcara} - {aksiJadwalTarget.namaKlien}
                </p>

           

                {/* Lihat / Cetak Struk (Nota) */}
                <button
                  type="button"
                  onClick={() => {
                    const target = aksiJadwalTarget;
                    setAksiJadwalTarget(null);
                    setStrukModalJadwal(target);
                  }}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border cursor-pointer hover:bg-slate-50"
                  style={{ borderColor: '#BDC3C7', color: '#2C3E50' }}
                >
                  <Receipt className="w-4 h-4" />
                  <span>Lihat / Cetak Struk (Nota)</span>
                </button>

<div className="flex flex-row items-center gap-3">
  {/* Pembayaran Selanjutnya */}

  <button
    type="button"
    onClick={() => {
      const target = aksiJadwalTarget;
      setAksiJadwalTarget(null);
      setDpModalTarget(target);
      setDpModalInputStr('');
    }}
    className="flex-1 min-w-0 py-3 px-2 rounded-xl font-bold text-sm border cursor-pointer hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
    style={{
      borderColor: '#F39C12',
      color: '#D35400',
      backgroundColor: '#FEF9E7'
    }}
  >
    <CreditCard className="w-4 h-4 shrink-0" />
    <span className="text-center"> + Pembayaran</span>
  </button>
  {/* Tandai Lunas */}
  <button
    type="button"
    onClick={() => handleTandaiLunas(aksiJadwalTarget)}
    className="flex-1 min-w-0 py-3 px-2 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-95"
    style={{ backgroundColor: '#27AE60' }}
  >
    <CheckCircle2 className="w-4 h-4 shrink-0" />
    <span>Tandai Lunas</span>
  </button>


</div>

                {/* Edit Data Event */}
                <button
                  type="button"
                  onClick={() => {
                    const target = aksiJadwalTarget;
                    setAksiJadwalTarget(null);
                    setEditingJadwal(target);
                    setFormModalMode('EDIT_JADWAL');
                  }}
                  className="w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border cursor-pointer hover:bg-slate-50"
                  style={{ borderColor: '#BDC3C7', color: '#2C3E50' }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Data Event</span>
                </button>

                     {/* Hubungi Klien via WhatsApp (#E3F2FD / #1E88E5) */}
                <button
                  type="button"
                  onClick={() => {
                    const target = aksiJadwalTarget;
                    setAksiJadwalTarget(null);
                    setWaChoiceTarget(target);
                  }}
                  className="w-full py-3 px-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
                  style={{ backgroundColor: '#E3F2FD', color: '#1E88E5' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi Klien via WhatsApp</span>
                </button>

<div className="flex flex-row items-center gap-3 mt-2">
  {/* Batalkan Jadwal */}
  <button
    type="button"
    onClick={() => handleBatalkanJadwal(aksiJadwalTarget)}
    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm cursor-pointer transition-opacity hover:opacity-90"
    style={{ backgroundColor: '#FFEBEE', color: '#D32F2F' }}
  >
    Batalkan
  </button>

  {/* Hapus Permanen */}
  <button
    type="button"
    onClick={() => handleDeleteJadwal(aksiJadwalTarget.idJadwal)}
    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 cursor-pointer hover:bg-red-50"
    style={{ color: '#D32F2F' }}
  >
    <Trash2 className="w-4 h-4 shrink-0" />
    <span>Hapus</span>
  </button>
</div>

              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DIALOG PILIH JENIS PESAN WHATSAPP (Tagihan vs Konfirmasi H-1)         */}
      {/* ===================================================================== */}
      {waChoiceTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setWaChoiceTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-3"
            style={{ backgroundColor: '#FFFFFF', color: '#2C3E50' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-center">Pilih Jenis Pesan WhatsApp</h3>
            <p className="text-xs text-center text-slate-500">
              Klien: {waChoiceTarget.namaKlien} ({waChoiceTarget.waPic})
            </p>
            <button
              type="button"
              onClick={() => {
                const t = waChoiceTarget;
                setWaChoiceTarget(null);
                handleKirimWA(t, 'TAGIHAN');
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#27AE60] cursor-pointer"
            >
              1. Tagih Sisa Pembayaran (Follow-up DP)
            </button>
            <button
              type="button"
              onClick={() => {
                const t = waChoiceTarget;
                setWaChoiceTarget(null);
                handleKirimWA(t, 'KONFIRMASI');
              }}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#2980B9] cursor-pointer"
            >
              2. Konfirmasi Kehadiran (H-1 Acara)
            </button>
            <button
              type="button"
              onClick={() => setWaChoiceTarget(null)}
              className="w-full py-2 text-xs font-bold text-slate-500 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DIALOG PILIH TAMBAH (+ FAB: Kasir Cepat vs Tambah Jadwal Baru)        */}
      {/* ===================================================================== */}
      {fabChoiceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setFabChoiceOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-3"
            style={{ backgroundColor: '#1E1E1E', color: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-center">Pilih Jenis Transaksi</h3>
            <button
              type="button"
              onClick={() => {
                setFabChoiceOpen(false);
                setEditingJadwal(null);
                setFormModalMode('KASIR_CEPAT');
              }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: '#27AE60' }}
            >
              <Zap className="w-4 h-4" />
              <span>Kasir Cepat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFabChoiceOpen(false);
                setEditingJadwal(null);
                setFormModalMode('TAMBAH_AGENDA');
              }}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer"
              style={{ backgroundColor: '#2980B9' }}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Tambah Agenda Booking Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL FORM KASIR CEPAT / TAMBAH JADWAL / EDIT JADWAL                  */}
      {/* ===================================================================== */}
      {formModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="w-full max-w-xl my-auto">
            <Suspense fallback={<div className="p-6 rounded-2xl bg-slate-900 text-center text-xs text-slate-300">Memuat formulir...</div>}>
              <ScheduleAndCashierForm
                modeAwal={formModalMode === 'KASIR_CEPAT' ? 'KASIR_CEPAT' : 'AGENDA_LENGKAP'}
                mode={formModalMode}
                selectedDate={
                  selectedDateStr ? new Date(`${selectedDateStr}T09:00:00`) : new Date()
                }
                defaultDateMillis={
                  selectedDateStr ? new Date(`${selectedDateStr}T09:00:00`).getTime() : Date.now()
                }
                paketList={paketList}
                pelangganList={pelangganList}
                jenisUsaha={owner.jenisUsaha}
                editItem={formModalMode === 'EDIT_JADWAL' ? editingJadwal : null}
                existingJadwal={formModalMode === 'EDIT_JADWAL' ? editingJadwal : null}
                allJadwalList={[...jadwalAktif, ...jadwalArsip]}
                onSave={handleSaveJadwal}
                onSavePelanggan={handleSavePelanggan}
                onOpenMasterPaket={() => {
                  setFormModalMode(null);
                  setEditingJadwal(null);
                  setActiveTab('PAKET');
                }}
                onCancel={() => {
                  setFormModalMode(null);
                  setEditingJadwal(null);
                }}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL PEMBAYARAN KE-2 / SELANJUTNYA (AKUMULASI & HITUNG SISA PEMBAYARAN) */}
      {/* ===================================================================== */}
      {dpModalTarget && (() => {
        const totalBersih = Math.max(0, dpModalTarget.hargaKotor - dpModalTarget.diskon);
        const sudahDibayarLama = dpModalTarget.dpDibayar || 0;
        const sisaTagihan = Math.max(0, totalBersih - sudahDibayarLama);
        const nominalInput = bersihkanTitik(dpModalInputStr);
        const totalAkumulasi = sudahDibayarLama + nominalInput;
        const sisaSetelahBayar = Math.max(0, totalBersih - totalAkumulasi);
        const isAkanLunas = (nominalInput >= sisaTagihan && sisaTagihan > 0) || totalAkumulasi >= totalBersih;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 overflow-y-auto">
            <div
              className="w-full max-w-lg rounded-2xl p-2 space-y-4 shadow-2xl my-auto border"
              style={{ backgroundColor: '#1E1E1E', borderColor: '#333333', color: '#FFFFFF' }}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-1">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Pembayaran Ke-2 atau Selanjutnya
                    </h3>
                    <p className="text-xs text-slate-400">
                      {dpModalTarget.namaAcara} — {dpModalTarget.namaKlien}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDpModalTarget(null)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Rincian Perhitungan Keuangan: Menghitung Sisa Pembayaran */}
              <div className="grid grid-cols-3 gap-1    text-center">
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-[10px] text-white/60 font-medium">Total Harga</p>
                  <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                    {keRupiah(totalBersih)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/5">
                  <p className="text-[10px] text-white/60 font-medium">
                    {sudahDibayarLama > 0 ? 'Sudah Masuk (DP)' : 'Belum Ada DP'}
                  </p>
                  <p className="text-xs sm:text-sm font-bold text-amber-400 mt-0.5">
                    {keRupiah(sudahDibayarLama)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[10px] text-amber-300 font-bold">Sisa Pembayaran</p>
                  <p className="text-xs sm:text-sm font-extrabold text-rose-400 mt-0.5">
                    {keRupiah(sisaTagihan)}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveDpModal} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-white/90">
                      Nominal Pembayaran Diterima Sekarang:
                    </label>
                    {sisaTagihan > 0 && (
                      <button
                        type="button"
                        onClick={() => setDpModalInputStr(formatRibuanInput(String(sisaTagihan)))}
                        className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                      >
                        ⚡ Pas ({keRupiah(sisaTagihan)})
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: 500.000 atau ketik nominal"
                    value={dpModalInputStr}
                    onChange={(e) => setDpModalInputStr(formatRibuanInput(e.target.value))}
                    className="w-full rounded-xl bg-black/50 border border-white/20 px-4 py-3 text-base  font-bold text-white focus:outline-hidden focus:border-amber-400 transition-colors"
                    autoFocus
                  />
                </div>

                {/* Indikator Otomatis Status Hasil Pembayaran */}
                {nominalInput > 0 && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all ${
                      isAkanLunas
                        ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-200'
                        : 'bg-sky-950/70 border-sky-500/60 text-sky-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {isAkanLunas ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-emerald-300 font-extrabold">
                            INDIKATOR LUNAS: Pembayaran ini melunasi seluruh sisa tagihan!
                          </span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="text-sky-300 font-extrabold">
                            PEMBAYARAN KE-2 / CICILAN: Akumulasi dana bertambah!
                          </span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] opacity-90 pl-6 space-y-0.5">
                      <p>
                        Total akumulasi dana masuk:{' '}
                        <strong className="text-white font-mono">{keRupiah(totalAkumulasi)}</strong>
                      </p>
                      <p>
                        Sisa tagihan berikutnya:{' '}
                        <strong className={isAkanLunas ? 'text-emerald-300 font-mono' : 'text-rose-300 font-mono'}>
                          {keRupiah(sisaSetelahBayar)}
                        </strong>
                        {isAkanLunas ? ' (Status otomatis menjadi LUNAS 🟢)' : ' (Status tetap DP / Cicilan 🟡)'}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setDpModalTarget(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10 cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white cursor-pointer transition-all flex items-center gap-1.5 shadow-lg ${
                      isAkanLunas
                        ? 'bg-emerald-600 hover:bg-emerald-500'
                        : 'bg-amber-600 hover:bg-amber-500'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAkanLunas ? 'Simpan & Tandai Lunas' : 'Simpan Pembayaran Ke-2'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ===================================================================== */}
      {/* MODAL DAFTAR PESANAN DARI WEBSITE KLIEN (flNotifWeb)                  */}
      {/* ===================================================================== */}
      {webInboxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div
            className="w-full max-w-xl rounded-2xl p-6 space-y-4 my-auto border"
            style={{ backgroundColor: '#1E1E1E', borderColor: '#333333', color: '#FFFFFF' }}
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold">
                Pesanan Masuk dari Web ({listPesananWebMenunggu.length})
              </h3>
              <button
                type="button"
                onClick={() => setWebInboxModalOpen(false)}
                className="p-1 text-white/70 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {listPesananWebMenunggu.length === 0 ? (
              <p className="text-xs text-white/70 py-6 text-center">
                Belum ada pesanan baru dari website portofolio klien.
              </p>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {listPesananWebMenunggu.map((w) => (
                  <div
                    key={w.idJadwal}
                    className="rounded-xl p-4 border border-white/10 bg-black/30 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-white">{w.namaKlien}</h4>
                        <p className="text-xs text-[#64B5F6] font-bold">
                          {w.namaAcara} • {w.paket}
                        </p>
                        <p className="text-xs text-white/70">
                          {formatHariTanggalIndo(w.tanggalMulai)} ({formatJamWIB(w.waktuMulai)}) •{' '}
                          {w.lokasi}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#2ECC71]">
                        {keRupiah(w.hargaKotor)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setWebInboxModalOpen(false);
                          setWebConfirmTarget(w);
                          setWebConfirmDpStr('');
                          setWebConfirmExtraName('');
                          setWebConfirmExtraStr('');
                        }}
                        className="flex-1 py-2 rounded-lg bg-[#27AE60] text-xs font-bold text-white cursor-pointer"
                      >
                        Terima &amp; Atur DP
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteJadwal(w.idJadwal)}
                        className="px-3 py-2 rounded-lg bg-[#C0392B] text-xs font-bold text-white cursor-pointer"
                      >
                        Tolak / Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {listPesananWebMenunggu.length > 0 && (
              <div className="pt-2 border-t border-white/10 flex justify-end items-center">
                <button
                  type="button"
                  onClick={() => setWebInboxModalOpen(false)}
                  className="px-4 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-white cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI PESANAN WEB */}
      {webConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ backgroundColor: '#1E1E1E', color: '#FFFFFF' }}
          >
            <h3 className="text-base font-bold">
              Konfirmasi Jadwal Web: {webConfirmTarget.namaKlien}
            </h3>
            <form onSubmit={handleConfirmWebSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-white/70 mb-1">Nominal DP Masuk (Rp)</label>
                <input
                  type="text"
                  placeholder="0 jika belum transfer"
                  value={webConfirmDpStr}
                  onChange={(e) => setWebConfirmDpStr(formatRibuanInput(e.target.value))}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Item Tambahan /Transport (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Transport Luar Kota"
                  value={webConfirmExtraName}
                  onChange={(e) => setWebConfirmExtraName(e.target.value)}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Biaya Tambahan (Rp)</label>
                <input
                  type="text"
                  placeholder="0"
                  value={webConfirmExtraStr}
                  onChange={(e) => setWebConfirmExtraStr(formatRibuanInput(e.target.value))}
                  className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWebConfirmTarget(null)}
                  className="px-4 py-2 rounded-lg bg-white/10 text-white cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#27AE60] font-bold text-white cursor-pointer"
                >
                  Konfirmasi &amp; Kirim WA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL GANTI TEMA & WALLPAPER PERSIS tampilkanDialogPilihTema APK      */}
      {/* ===================================================================== */}
      {temaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 overflow-y-auto"
          onClick={() => setTemaModalOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-2 space-y-2 border shadow-2xl my-auto"
            style={{ backgroundColor: '#1A1E24', borderColor: '#333D4B', color: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: navThemeColor }}
                >
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pengaturan Tema </h3>
                  <p className="text-[11px] text-white/60">Sesuaikan warna &amp; latar belakang wallpaper</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTemaModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input file tersembunyi untuk upload foto background kustom */}
            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              onChange={handleBackgroundUpload}
              className="hidden"
            />

            {/* ================================================================= */}
            {/* SEKSI 1: WARNA & LATAR BELAKANG NAVIGASI, BAR & TOOLBAR           */}
            {/* ================================================================= */}
            <div className="space-y-3 p-2 rounded-xl border border-sky-500/20 bg-sky-950/20">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                    <label className="text-xs font-bold text-sky-300 uppercase tracking-wide">
                      1. Warna Tema 
                    </label>
                  </div>
                 
                </div>
              </div>

              {/* Palet 10 Warna Populer */}
              <div className="space-y-1.5 pt-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DAFTAR_WARNA_TEMA_APK.map((w) => {
                    const isAktif = (owner.warnaTema || '#34495E') === w.kode;
                    return (
                      <button
                        key={w.kode}
                        type="button"
                        onClick={async () => {
                          setOwner((prev) => ({ ...prev, warnaTema: w.kode }));
                          if (sessionMode === 'FIREBASE') {
                            await saveOwnerProfileToFirebase(targetOwnerId, { warnaTema: w.kode });
                          }
                        }}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                          isAktif ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-black shadow-md' : 'opacity-90 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: w.kode,
                          borderColor: isAktif ? '#F39C12' : 'rgba(255,255,255,0.2)',
                          color: '#FFFFFF',
                        }}
                      >
                        <span className="truncate text-[11px] drop-shadow-xs">{w.nama.split(' ')[0]}</span>
                        {isAktif && (
                          <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded shadow-xs">
                            AKTIF
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pemilih Warna Bebas (Custom Color Picker) */}
              <div className="flex items-center gap-3 bg-black/40 p-2 rounded-xl border border-white/10">
                <label className="text-xs text-white/80 font-bold shrink-0">Warna Custom:</label>
                <input
                  type="color"
                  value={owner.warnaTema || '#34495E'}
                  onChange={async (e) => {
                    const customColor = e.target.value;
                    setOwner((prev) => ({ ...prev, warnaTema: customColor }));
                    if (sessionMode === 'FIREBASE') {
                      await saveOwnerProfileToFirebase(targetOwnerId, { warnaTema: customColor });
                    }
                  }}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                  title="Pilih warna navigasi kustom"
                />
                <input
                  type="text"
                  value={owner.warnaTema || '#34495E'}
                  onChange={async (e) => {
                    const customColor = e.target.value;
                    setOwner((prev) => ({ ...prev, warnaTema: customColor }));
                    if (sessionMode === 'FIREBASE' && /^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                      await saveOwnerProfileToFirebase(targetOwnerId, { warnaTema: customColor });
                    }
                  }}
                  placeholder="#34495E"
                  className="w-28 px-2 py-1 text-xs font-mono font-bold uppercase rounded-lg bg-black/50 border border-white/20 text-amber-300 text-center"
                />
                <span className="text-[10px] text-white/50 truncate">Hex bar warna</span>
              </div>

              {/* Gaya Latar Belakang Navigasi (Solid vs Glass vs Gradient vs Dark Accent) */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/90">Gaya Bar Navigasi (Atas &amp; Bawah):</span>
                  <span className="text-[10px] font-mono text-amber-300 font-bold uppercase">
                    {owner.gayaLatarNavigasi || 'SOLID'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'SOLID', label: 'Solid / Tegas', desc: 'Warna penuh pekat' },
                    { id: 'GLASS', label: 'Kaca / Glass', desc: 'Tembus wallpaper & blur' },
                    { id: 'GRADIENT', label: 'Gradasi Halus', desc: 'Warna tema ke gelap' },
                    { id: 'DARK_ACCENT', label: 'Aksen Gelap', desc: 'Hitam pekat + lis warna' },
                  ].map((styleOpt) => {
                    const isSelected = (owner.gayaLatarNavigasi || 'SOLID') === styleOpt.id;
                    return (
                      <button
                        key={styleOpt.id}
                        type="button"
                        onClick={async () => {
                          const val = styleOpt.id as 'SOLID' | 'GLASS' | 'GRADIENT' | 'DARK_ACCENT';
                          setOwner((prev) => ({ ...prev, gayaLatarNavigasi: val }));
                          if (sessionMode === 'FIREBASE') {
                            await saveOwnerProfileToFirebase(targetOwnerId, { gayaLatarNavigasi: val });
                          }
                        }}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/25 border-amber-400 text-white shadow-md ring-1 ring-amber-400'
                            : 'bg-black/30 border-white/10 text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs font-bold">{styleOpt.label}</div>
                        <div className="text-[10px] text-white/60">{styleOpt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider Opasitas Navigasi */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white/90">Transparansi Bar Navigasi:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {typeof owner.opasitasNavigasi === 'number' ? owner.opasitasNavigasi : 95}%
                  </span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="100"
                  step="5"
                  value={typeof owner.opasitasNavigasi === 'number' ? owner.opasitasNavigasi : 95}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value, 10);
                    setOwner((prev) => ({ ...prev, opasitasNavigasi: val }));
                    if (sessionMode === 'FIREBASE') {
                      await saveOwnerProfileToFirebase(targetOwnerId, { opasitasNavigasi: val });
                    }
                  }}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-black/40 rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[9.5px] text-white/40">
                  <span>40% (Kaca Tembus Wallpaper)</span>
                  <span>100% (Solid Pekat)</span>
                </div>
              </div>
            </div>

            {/* ================================================================= */}
            {/* SEKSI 2: LATAR BELAKANG UTAMA (WALLPAPER TERANG / GELAP)          */}
            {/* ================================================================= */}
            <div className="space-y-3 p-4 rounded-xl border border-amber-500/20 bg-amber-950/15">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <label className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                      2. Latar Belakang Utama Aplikasi
                    </label>
                  </div>
                </div>
              </div>

              {/* Mode Dasar Background jika Tanpa Foto (Terang vs Gelap) */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-white/80">Mode Dasar Layar Utama:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setOwner((prev) => ({ ...prev, isKacaGelap: true }));
                      if (sessionMode === 'FIREBASE') {
                        await saveOwnerProfileToFirebase(targetOwnerId, { isKacaGelap: true });
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      isKacaGelap
                        ? 'bg-slate-900 border-amber-400 text-white shadow-md'
                        : 'bg-black/30 border-white/15 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>🌙 Mode Gelap (Dark Studio)</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setOwner((prev) => ({ ...prev, isKacaGelap: false }));
                      if (sessionMode === 'FIREBASE') {
                        await saveOwnerProfileToFirebase(targetOwnerId, { isKacaGelap: false });
                      }
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      !isKacaGelap
                        ? 'bg-slate-100 text-slate-900 border-white font-extrabold shadow-md'
                        : 'bg-white/10 border-white/15 text-white/60 hover:text-white'
                    }`}
                  >
                    <span>☀️ Mode Terang (Light Studio)</span>
                  </button>
                </div>
              </div>

              {/* Opsi Upload Wallpaper Foto Kustom */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white/80">Foto / Wallpaper Kustom:</span>
                  {owner.customBackgroundUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        const updates = { customBackgroundUrl: '' };
                        setOwner((prev) => ({ ...prev, ...updates }));
                        if (sessionMode === 'FIREBASE') {
                          await saveOwnerProfileToFirebase(targetOwnerId, updates);
                        }
                        setToastMessage('Foto wallpaper dihapus (kembali ke latar solid netral)');
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  )}
                </div>

                {/* Tombol Kolom Upload Foto */}
                <div
                  onClick={() => bgFileInputRef.current?.click()}
                  className="group border-2 border-dashed border-white/20 hover:border-amber-400/70 rounded-xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-white/[0.03] hover:bg-white/[0.06]"
                >
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-white">
                    Klik di Sini untuk Upload Foto Wallpaper
                  </p>
                  <p className="text-[10px] text-white/60">
                  </p>
                </div>

                {/* Pratinjau Foto Aktif jika Ada */}
                {owner.customBackgroundUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-white/15 h-20 flex items-end p-2.5">
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${owner.customBackgroundUrl})`,
                        filter: `blur(${owner.customBackgroundBlur ?? 8}px)`,
                        transform: 'scale(1.12)',
                      }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: owner.customBackgroundOverlayType === 'PUTIH' ? '#FFFFFF' : '#000000',
                        opacity: (owner.customBackgroundOpacity ?? 60) / 100,
                      }}
                    />
                    <div className="relative z-10 flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                        Wallpaper Aktif ({owner.customBackgroundOverlayType === 'PUTIH' ? 'Nuansa Terang' : 'Nuansa Gelap'})
                      </span>
                      <button
                        type="button"
                        onClick={() => bgFileInputRef.current?.click()}
                        className="text-[10px] font-bold text-amber-300 hover:text-amber-200 bg-black/70 px-2 py-0.5 rounded cursor-pointer backdrop-blur-sm"
                      >
                        Ganti Foto
                      </button>
                    </div>
                  </div>
                )}

                {/* Slider Blur Foto Wallpaper */}
                {owner.customBackgroundUrl && (
                  <div className="space-y-1.5 bg-black/30 rounded-xl p-2.5 border border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white/90 flex items-center gap-1.5 text-[11px]">
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        Blur Wallpaper:
                      </span>
                      <span className="font-mono font-bold text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                        {owner.customBackgroundBlur ?? 8} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="25"
                      step="1"
                      value={owner.customBackgroundBlur ?? 8}
                      onChange={async (e) => {
                        const blurVal = Number(e.target.value);
                        setOwner((prev) => ({ ...prev, customBackgroundBlur: blurVal }));
                        if (sessionMode === 'FIREBASE') {
                          await saveOwnerProfileToFirebase(targetOwnerId, { customBackgroundBlur: blurVal });
                        }
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-white/20 rounded-lg"
                    />
                  </div>
                )}

                {/* Nuansa Overlay Wallpaper (Terang / Gelap) */}
                {owner.customBackgroundUrl && (
                  <div className="space-y-2 bg-black/30 rounded-xl p-2.5 border border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white/90 text-[11px]">Nuansa Lapisan Wallpaper:</span>
                      <span className="text-[11px] font-bold text-amber-300">
                        {owner.customBackgroundOverlayType === 'PUTIH' ? '⬜ Putih (Terang)' : '⬛ Hitam (Gelap)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const updates = { customBackgroundOverlayType: 'HITAM' as const };
                          setOwner((prev) => ({ ...prev, ...updates }));
                          if (sessionMode === 'FIREBASE') {
                            await saveOwnerProfileToFirebase(targetOwnerId, updates);
                          }
                        }}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                          owner.customBackgroundOverlayType !== 'PUTIH'
                            ? 'bg-black border-amber-400 text-white shadow-sm'
                            : 'bg-black/40 border-white/15 text-white/60'
                        }`}
                      >
                        ⬛ Lapisan Gelap
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const updates = { customBackgroundOverlayType: 'PUTIH' as const };
                          setOwner((prev) => ({ ...prev, ...updates }));
                          if (sessionMode === 'FIREBASE') {
                            await saveOwnerProfileToFirebase(targetOwnerId, updates);
                          }
                        }}
                        className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                          owner.customBackgroundOverlayType === 'PUTIH'
                            ? 'bg-white text-slate-900 border-white font-extrabold shadow-sm'
                            : 'bg-white/10 border-white/15 text-white/60'
                        }`}
                      >
                        ⬜ Lapisan Terang
                      </button>
                    </div>

                    {/* Slider Kepekatan Overlay Wallpaper */}
                    <div className="space-y-1 pt-1 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] text-white/80">
                          Kepekatan Lapisan Wallpaper:
                        </span>
                        <span className="font-mono font-bold text-xs text-sky-400">
                          {owner.customBackgroundOpacity ?? 60}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="90"
                        step="5"
                        value={owner.customBackgroundOpacity ?? 60}
                        onChange={async (e) => {
                          const opVal = Number(e.target.value);
                          setOwner((prev) => ({ ...prev, customBackgroundOpacity: opVal }));
                          if (sessionMode === 'FIREBASE') {
                            await saveOwnerProfileToFirebase(targetOwnerId, { customBackgroundOpacity: opVal });
                          }
                        }}
                        className="w-full accent-sky-400 cursor-pointer h-2 bg-white/20 rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ================================================================= */}
            {/* SEKSI 3: GAYA KARTU KACA KALENDER & JADWAL (GLASSMORPHISM)        */}
            {/* ================================================================= */}
            <div className="space-y-2.5 p-4 rounded-xl border border-white/10 bg-black/25">
              <label className="block text-xs font-bold text-white/80 uppercase tracking-wide">
                3. Transparansi Kartu Kalender &amp; Jadwal
              </label>

              {/* Slider Transparansi Kaca Kartu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-white/80">
                    Kepekatan Kartu Agenda:
                  </span>
                  <span className="font-mono font-bold text-xs text-amber-400">
                    {owner.opasitasKartu ?? (owner.customBackgroundUrl ? 58 : 70)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="90"
                  step="5"
                  value={owner.opasitasKartu ?? (owner.customBackgroundUrl ? 58 : 70)}
                  onChange={async (e) => {
                    const val = Number(e.target.value);
                    setOwner((prev) => ({ ...prev, opasitasKartu: val }));
                    if (sessionMode === 'FIREBASE') {
                      await saveOwnerProfileToFirebase(targetOwnerId, { opasitasKartu: val });
                    }
                  }}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-white/20 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-white/50">
                  <span>30% (Transparan)</span>
                  <span>58% (Sedang Elegan)</span>
                  <span>90% (Pekat)</span>
                </div>
              </div>
            </div>

            {/* Tombol Simpan & Tutup */}
            <div className="pt-2 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setTemaModalOpen(false)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer shadow-lg hover:shadow-amber-500/25"
              >
                Selesai &amp; Simpan Tampilan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL PILIHAN PAKET & PERPANJANG LANGGANAN STUDIO (CHAT ADMIN WA)     */}
      {/* ===================================================================== */}
      {langgananModalOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setLanggananModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-6 space-y-5 border shadow-2xl my-auto"
            style={{ backgroundColor: '#1E1E1E', borderColor: '#333333', color: '#FFFFFF' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Perpanjang Langganan
                  </h3>
                  <p className="text-xs text-slate-400">
                   Hubungi Admin via WhatsApp untuk Aktivasi Cepat
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLanggananModalOpen(false)}
                className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Paket Aktif Saat Ini */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-white/15 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 font-medium">Paket Aktif Anda:</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-lg font-black text-[#2ECC71]">
                    PAKET {owner.paketAktif.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F39C12] text-white">
                    AKTIF
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium">Masa Aktif Tersisa:</p>
                <p className="text-base font-black text-amber-300 mt-0.5">
                  {sisaHariLangganan} Hari Lagi
                </p>
              </div>
            </div>

            {/* Toggle Durasi: Bulanan vs Tahunan */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs font-bold text-white/90 block">Pilih Durasi:</span>
              </div>
              <div className="flex items-center p-1 rounded-xl bg-black/50 border border-white/15 text-xs">
                <button
                  type="button"
                  onClick={() => setDurasiPerpanjang('BULANAN')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    durasiPerpanjang === 'BULANAN'
                      ? 'bg-[#2980B9] text-white shadow'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  Bulanan
                </button>
                <button
                  type="button"
                  onClick={() => setDurasiPerpanjang('TAHUNAN')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    durasiPerpanjang === 'TAHUNAN'
                      ? 'bg-amber-500 text-slate-950 shadow font-extrabold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  <span>Tahunan</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black">
                    HEMAT
                  </span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPaketExpanded(!isPaketExpanded)}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-slate-700 text-white font-bold text-sm cursor-pointer hover:bg-slate-700/50 transition-all"
            >
              <span>{isPaketExpanded ? 'Tutup Pilihan Paket' : 'Pilih Paket Langganan'}</span>
              <span>{isPaketExpanded ? '▲' : '▼'}</span>
            </button>

            {isPaketExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
              {[
                {
                  tier: 'Starter' as const,
                  title: 'Paket Starter',
                  subtitle: 'Standar Studio HP',
                  price: durasiPerpanjang === 'TAHUNAN' ? 'Rp 158.400' : 'Rp 16.500',
                  period: durasiPerpanjang === 'TAHUNAN' ? '/ tahun' : '/ bulan',
                  highlight: 'Khusus Usaha Mandiri',
                  badgeColor: 'bg-slate-700',
                  features: [
                    '1 Owner (0 Admin, 0 Crew)',
                    'Maksimal 100 Jadwal / Bulan',
                    'Aplikasi HP & PWA Standalone',
                    'Kasir Cepat & Struk Digital',
                    'Pengingat WhatsApp Otomatis',
                  ],
                },
                {
                  tier: 'Pro' as const,
                  title: 'Paket Pro',
                  subtitle: 'Paling Populer & Lengkap',
                  price: durasiPerpanjang === 'TAHUNAN' ? 'Rp 432.000' : 'Rp 45.000',
                  period: durasiPerpanjang === 'TAHUNAN' ? '/ tahun' : '/ bulan',
                  highlight: '⭐ TERLARIS & REKOMENDASI',
                  badgeColor: 'bg-blue-600',
                  features: [
                    '1 Owner & 1 Admin Studio',
                    'Maksimal 300 Jadwal / Bulan',
                    'Akses Kasir PC & Aplikasi HP',
                    'Link Website Booking & Portofolio',
                    'Laporan Keuangan & Piutang Lengkap',
                  ],
                },
                {
                  tier: 'Ultimate' as const,
                  title: 'Paket Ultimate',
                  subtitle: 'Multi-Tim & Tanpa Batas',
                  price: durasiPerpanjang === 'TAHUNAN' ? 'Rp 1.334.400' : 'Rp 139.000',
                  period: durasiPerpanjang === 'TAHUNAN' ? '/ tahun' : '/ bulan',
                  highlight: '👑 UNLIMITED & LIVE SYNC',
                  badgeColor: 'bg-amber-600',
                  features: [
                    '1 Owner, 2 Admin & 10 Crew',
                    'Jadwal Unlimited Tanpa Batas',
                    'Kasir PC Live Sync Real-time',
                    'Website Profil Utama + Sekunder',
                    'Prioritas Support Admin 24/7',
                  ],
                },
              ].map((pkt) => {
                const isCurrentActive = owner.paketAktif.toLowerCase() === pkt.tier.toLowerCase();
                const isSelected = pilihanPaketTarget === pkt.tier;

                return (
                  <div
                    key={pkt.tier}
                    onClick={() => setPilihanPaketTarget(pkt.tier)}
                    className={`rounded-2xl p-4 border flex flex-col justify-between transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-sky-950/40 border-amber-400 shadow-xl ring-2 ring-amber-400/30'
                        : isCurrentActive
                        ? 'bg-slate-900/90 border-emerald-500/60'
                        : 'bg-black/40 border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${pkt.badgeColor}`}
                        >
                          {pkt.highlight}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                            Aktif
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-base text-white mt-1">{pkt.title}</h4>
                      <p className="text-[11px] text-slate-400">{pkt.subtitle}</p>

                      <div className="my-3 py-2 border-y border-white/10">
                        <span className="text-lg font-black text-amber-300 font-mono">
                          {pkt.price}
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1">{pkt.period}</span>
                      </div>

                      <ul className="space-y-1.5 text-[11px] text-slate-300">
                        {pkt.features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 font-bold">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPilihanPaketTarget(pkt.tier);
                          handleChatAdminPerpanjang(pkt.tier);
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow ${
                          isSelected
                            ? 'bg-[#27AE60] hover:bg-[#219653] text-white shadow-emerald-900/50'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Perpanjang {pkt.tier} (Chat WA)</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            )}

            {/* Tombol Utama Chat Admin WhatsApp untuk Perpanjangan */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Pilihan saat ini: <strong className="text-white">Paket {pilihanPaketTarget}</strong> ({durasiPerpanjang === 'TAHUNAN' ? 'Tahunan' : 'Bulanan'})
                <span className="block text-[11px] text-emerald-400 mt-0.5 font-medium">
                  CS Admin WhatsApp: 0831-3230-4649
                </span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setLanggananModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/70 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleChatAdminPerpanjang()}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#27AE60] hover:bg-[#219653] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat Admin via WhatsApp untuk Perpanjang</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STRUK / NOTA DIGITAL (dialog_struk.xml) */}
      <Suspense fallback={null}>
        {strukModalJadwal && (
          <StrukModal
            jadwal={strukModalJadwal}
            owner={owner}
            rekening={rekening}
            namaAdminAktif={activeUserName || owner.namaOwner || owner.namaBrand}
            onClose={() => setStrukModalJadwal(null)}
          />
        )}

        {/* MODAL TANDA TANGAN DIGITAL & LOGO STUDIO */}
        {signatureModalOpen && (
          <SignatureAndLogoModal
            owner={owner}
            onSave={async (updates) => {
              setOwner((prev) => {
                const updatedOwner = { ...prev, ...updates };
                try {
                  const targetKey = getWorkspaceCacheKey(targetOwnerId);
                  const raw = localStorage.getItem(targetKey);
                  if (raw) {
                    const parsed = JSON.parse(raw);
                    parsed.owner = updatedOwner;
                    localStorage.setItem(targetKey, JSON.stringify(parsed));
                  }
                } catch {}
                return updatedOwner;
              });
              setSignatureModalOpen(false);
              setToastMessage('✓ Pengaturan logo & tanda tangan struk tersimpan');
              setTimeout(() => setToastMessage(null), 3000);
              if (sessionMode === 'FIREBASE') {
                await saveOwnerProfileToFirebase(targetOwnerId, updates);
              }
            }}
            onClose={() => setSignatureModalOpen(false)}
          />
        )}

        {/* Global Top-Up Modal */}
        {isTopUpGlobalOpen && (
          <TopUpModal
            isOpen={isTopUpGlobalOpen}
            onClose={() => setIsTopUpGlobalOpen(false)}
            owner={owner}
          />
        )}
      </Suspense>

      {/* Indikator Status Offline & Pemulihan Koneksi */}
      <OfflineIndicator />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl bg-slate-900 text-white font-bold text-xs sm:text-sm border border-white/20 flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}
      </div>
    </div>
  );
}
