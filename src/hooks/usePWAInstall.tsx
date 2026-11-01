import React, { useEffect, useState } from 'react';
import {
  MonitorDown,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  WifiOff,
  CheckCircle2,
  X,
  Download,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_BANNER_DISMISSED_KEY = 'KAFELA_PWA_BANNER_DISMISSED_V1';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Modal Panduan Perintah Install di iOS (iPhone/iPad), Android, dan PC Desktop
 */
export const PWAInstallGuideModal: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultTab?: 'IOS' | 'ANDROID' | 'PC';
  isInstallable?: boolean;
  onTriggerNativeInstall?: () => Promise<boolean>;
}> = ({ open, onClose, defaultTab = 'ANDROID', isInstallable = false, onTriggerNativeInstall }) => {
  const [activeDeviceTab, setActiveDeviceTab] = useState<'IOS' | 'ANDROID' | 'PC'>(defaultTab);

  useEffect(() => {
    setActiveDeviceTab(defaultTab);
  }, [defaultTab, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-[#181C22] border border-white/15 p-5 text-white shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2980B9]/25 border border-[#2980B9]/50 flex items-center justify-center text-[#64B5F6]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white">
                Pasang Aplikasi Kafela&apos;s Agenda
              </h3>
              <p className="text-[11px] text-slate-400">
                Akses cepat dari Layar Utama HP atau Desktop PC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pilihan Tab Perangkat: Android • iPhone/iOS • PC/Laptop */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveDeviceTab('ANDROID')}
            className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
              activeDeviceTab === 'ANDROID'
                ? 'bg-[#27AE60] text-white shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            🤖 Android
          </button>
          <button
            type="button"
            onClick={() => setActiveDeviceTab('IOS')}
            className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
              activeDeviceTab === 'IOS'
                ? 'bg-[#2980B9] text-white shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            🍎 iOS / iPhone
          </button>
          <button
            type="button"
            onClick={() => setActiveDeviceTab('PC')}
            className={`py-2 px-2 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
              activeDeviceTab === 'PC'
                ? 'bg-[#8E44AD] text-white shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            💻 PC / Laptop
          </button>
        </div>

        {/* Isi Panduan Sesuai Tab */}
        {activeDeviceTab === 'ANDROID' && (
          <div className="space-y-3">
            {isInstallable && onTriggerNativeInstall && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await onTriggerNativeInstall();
                  if (ok) onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#27AE60] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Pasang Otomatis ke HP Android Sekarang</span>
              </button>
            )}

            <div className="rounded-xl bg-black/35 border border-white/10 p-3.5 space-y-3 text-xs text-slate-200">
              <p className="font-bold text-[#2ECC71]">
                Cara Pasang di HP Android (Chrome / Browser Bawaan):
              </p>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#27AE60] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Ketuk ikon <strong>Titik Tiga</strong>{' '}
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">
                    <MoreVertical className="w-3 h-3" />
                  </span>{' '}
                  di pojok kanan atas browser Chrome.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#27AE60] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Pilih menu <strong>&quot;Instal aplikasi&quot;</strong> atau{' '}
                  <strong>&quot;Tambahkan ke layar utama&quot;</strong> (<em>Add to Home screen</em>).
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#27AE60] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Ketuk <strong>Instal</strong> — ikon <strong>Kafela&apos;s Agenda</strong> akan
                  langsung muncul di layar HP seperti aplikasi penuh.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeDeviceTab === 'IOS' && (
          <div className="rounded-xl bg-black/35 border border-white/10 p-3.5 space-y-3 text-xs text-slate-200">
            <p className="font-bold text-[#64B5F6]">
              Cara Pasang di iPhone / iPad (Wajib pakai browser Safari):
            </p>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#2980B9] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <p>
                Ketuk tombol <strong>Bagikan (Share)</strong>{' '}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-[#64B5F6] font-bold">
                  <Share className="w-3 h-3" /> Share
                </span>{' '}
                di bilah bawah browser Safari.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#2980B9] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <p>
                Geser menu ke bawah lalu ketuk{' '}
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">
                  <PlusSquare className="w-3 h-3" /> Tambah ke Layar Utama
                </span>{' '}
                (<em>Add to Home Screen</em>).
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-[#2980B9] text-white font-extrabold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <p>
                Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas. Aplikasi siap dibuka penuh
                dari layar utama iPhone/iPad Anda.
              </p>
            </div>
          </div>
        )}

        {activeDeviceTab === 'PC' && (
          <div className="space-y-3">
            {isInstallable && onTriggerNativeInstall && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await onTriggerNativeInstall();
                  if (ok) onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#8E44AD] hover:opacity-95 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <MonitorDown className="w-4 h-4" />
                <span>Install Langsung ke Desktop PC Sekarang</span>
              </button>
            )}

            <div className="rounded-xl bg-black/35 border border-white/10 p-3.5 space-y-2.5 text-xs text-slate-200">
              <p className="font-bold text-purple-300">
                Cara Pasang ke Desktop Windows / Mac (Chrome &amp; Edge):
              </p>
              <p>
                <strong>1.</strong> Klik ikon <strong>Install (Komputer dengan panah bawah)</strong>{' '}
                di sebelah kanan kolom alamat URL browser atas.
              </p>
              <p>
                <strong>2.</strong> Klik <strong>Instal</strong> — aplikasi akan tampil mandiri di
                Desktop &amp; Taskbar PC tanpa bar browser.
              </p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl bg-[#2980B9] hover:opacity-95 py-2.5 text-xs font-extrabold text-white transition-opacity cursor-pointer"
        >
          Mengerti &amp; Tutup
        </button>
      </div>
    </div>
  );
};

/**
 * Banner Perintah Install Otomatis di Bagian Bawah Layar untuk iOS, Android, atau PC
 */
export const PWAInstallFloatingBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(INSTALL_BANNER_DISMISSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled || dismissed) return null;

  const defaultTab: 'IOS' | 'ANDROID' | 'PC' = isIOS ? 'IOS' : isAndroid ? 'ANDROID' : 'PC';

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(INSTALL_BANNER_DISMISSED_KEY, '1');
    } catch {}
  };

  return (
    <>
      <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:w-[400px] z-40 rounded-2xl bg-[#181C22]/95 border border-[#2980B9]/60 p-3.5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2980B9] flex items-center justify-center shrink-0 shadow">
            {isIOS || isAndroid ? (
              <Smartphone className="w-5 h-5 text-white" />
            ) : (
              <MonitorDown className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs sm:text-sm font-extrabold text-white leading-snug">
                {isIOS
                  ? 'Pasang Aplikasi di iPhone / iPad'
                  : isAndroid
                  ? 'Pasang Aplikasi di HP Android'
                  : 'Install Aplikasi ke Layar Utama'}
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 -mr-1 -mt-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
              {isIOS
                ? 'Ketuk tombol Share di Safari lalu pilih "Tambah ke Layar Utama" agar tampil penuh seperti aplikasi.'
                : isAndroid
                ? 'Pasang Kafela\'s Agenda ke layar utama HP Android untuk akses cepat & ringan.'
                : 'Pasang di HP Android, iOS (iPhone), atau Desktop PC agar berjalan layar penuh.'}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (isInstallable) {
                    await install();
                  } else {
                    setShowGuideModal(true);
                  }
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#27AE60] hover:opacity-95 text-white text-xs font-extrabold shadow cursor-pointer"
              >
                {isIOS
                  ? 'Lihat Cara Pasang di iOS'
                  : isInstallable
                  ? 'Install Sekarang'
                  : 'Cara Install (Android / iOS)'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Nanti
              </button>
            </div>
          </div>
        </div>
      </div>

      <PWAInstallGuideModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        defaultTab={defaultTab}
        isInstallable={isInstallable}
        onTriggerNativeInstall={install}
      />
    </>
  );
};

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Aplikasi Terpasang</span>
      </div>
    );
  }

  const defaultTab: 'IOS' | 'ANDROID' | 'PC' = isIOS ? 'IOS' : isAndroid ? 'ANDROID' : 'PC';
  const buttonLabel = isIOS
    ? 'Install di iPhone / iOS'
    : isAndroid
    ? 'Install Aplikasi Android'
    : 'Install Aplikasi (HP / PC)';

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuideModal(true);
          }
        }}
        className={`flex items-center justify-center gap-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          compact ? 'px-3 py-1.5 text-xs' : 'w-full px-3.5 py-2.5 text-xs shadow-sm'
        }`}
      >
        {isIOS || isAndroid ? (
          <Smartphone className="w-4 h-4 shrink-0" />
        ) : (
          <MonitorDown className="w-4 h-4 shrink-0" />
        )}
        <span>{buttonLabel}</span>
      </button>

      <PWAInstallGuideModal
        open={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        defaultTab={defaultTab}
        isInstallable={isInstallable}
        onTriggerNativeInstall={install}
      />
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    } else if (wasOffline) {
      setShowRestored(true);
      const t = setTimeout(() => {
        setShowRestored(false);
        setWasOffline(false);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showRestored) return null;

  if (showRestored) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-emerald-600/95 border border-emerald-400 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur-md">
        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
        <span>Koneksi Pulih &bull; Sinkronisasi Cloud Firebase Aktif</span>
      </div>
    );
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 border border-amber-300 px-4 py-2 text-xs font-bold text-slate-950 shadow-2xl backdrop-blur-md">
      <WifiOff className="w-4 h-4 text-slate-950 shrink-0" />
      <span>Mode Offline &bull; Transaksi Tersimpan Aman di HP &amp; Otomatis Tersinkron Saat Online</span>
    </div>
  );
};
