import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  HelpCircle,
  Lock,
  LogOut,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { OwnerProfile, PaketLanggananTier, UserRoleType } from '../types/kafela';
import { renewSubscriptionWithSaldo } from '../services/firebaseClient';
import { formatTanggalIndo } from '../utils/formatters';
import { TopUpModal } from './TopUpModal';

interface SubscriptionExpiredScreenProps {
  owner: OwnerProfile;
  userRole: UserRoleType;
  onUpdateOwner: (updates: Partial<OwnerProfile>) => void;
  onEnterReadOnly?: () => void;
  onLogout: () => void;
  onCloseTestMode?: () => void;
  isTestPreview?: boolean;
}

export function SubscriptionExpiredScreen({
  owner,
  userRole,
  onUpdateOwner,
  onEnterReadOnly,
  onLogout,
  onCloseTestMode,
  isTestPreview = false,
}: SubscriptionExpiredScreenProps) {
  const [durasiPilihan, setDurasiPilihan] = useState<'BULANAN' | 'TAHUNAN'>('BULANAN');
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isAnggota = userRole === 'anggota';
  const currentSaldo = owner.saldo || 0;

  // Daftar Paket Resmi Kafela's Agenda
  const DAFTAR_PAKET = [
    {
      tier: 'Starter' as PaketLanggananTier,
      title: 'Paket Starter',
      subtitle: 'Standar Usaha Mandiri',
      days: durasiPilihan === 'TAHUNAN' ? 365 : 30,
      priceVal: durasiPilihan === 'TAHUNAN' ? 158400 : 16500,
      priceLabel: durasiPilihan === 'TAHUNAN' ? 'Rp 158.400' : 'Rp 16.500',
      periodLabel: durasiPilihan === 'TAHUNAN' ? '/ tahun' : '/ bulan',
      badge: 'HEMAT',
      badgeColor: 'bg-slate-700 text-slate-200',
      features: [
        '1 Akun Owner (Khusus HP / PWA)',
        'Maksimal 100 Agenda Jadwal / Bulan',
        'Kasir Cepat & Cetak Struk Digital',
        'Pengingat WhatsApp Otomatis',
      ],
    },
    {
      tier: 'Pro' as PaketLanggananTier,
      title: 'Paket Pro',
      subtitle: 'Paling Laris & Fleksibel',
      days: durasiPilihan === 'TAHUNAN' ? 365 : 30,
      priceVal: durasiPilihan === 'TAHUNAN' ? 432000 : 45000,
      priceLabel: durasiPilihan === 'TAHUNAN' ? 'Rp 432.000' : 'Rp 45.000',
      periodLabel: durasiPilihan === 'TAHUNAN' ? '/ tahun' : '/ bulan',
      badge: 'TERLARIS ⭐',
      badgeColor: 'bg-sky-600 text-white font-bold',
      isPopular: true,
      features: [
        '1 Akun Owner + 1 Admin Studio',
        'Maksimal 300 Agenda Jadwal / Bulan',
        'Akses Kasir PC & Web Kasir Desktop',
        'Website Profil Portofolio & Booking Online',
        'Laporan Keuangan & Piutang Lengkap',
      ],
    },
    {
      tier: 'Ultimate' as PaketLanggananTier,
      title: 'Paket Ultimate',
      subtitle: 'Multi-Tim & Tanpa Batas',
      days: durasiPilihan === 'TAHUNAN' ? 365 : 30,
      priceVal: durasiPilihan === 'TAHUNAN' ? 1334400 : 139000,
      priceLabel: durasiPilihan === 'TAHUNAN' ? 'Rp 1.334.400' : 'Rp 139.000',
      periodLabel: durasiPilihan === 'TAHUNAN' ? '/ tahun' : '/ bulan',
      badge: 'UNLIMITED 👑',
      badgeColor: 'bg-amber-500 text-slate-950 font-extrabold',
      features: [
        '1 Owner, 2 Admin & 10 Akun Kru',
        'Jadwal Unlimited Tanpa Batas Kuota',
        'Kasir PC Live Sync Multi-Device',
        'Web Profil Utama + Sub-Profil Sekunder',
        'Prioritas Bantuan Admin 24/7',
      ],
    },
  ];

  const handleRenewWithSaldo = async (tier: PaketLanggananTier, days: number, priceVal: number, title: string) => {
    if (currentSaldo < priceVal) {
      setIsTopUpOpen(true);
      return;
    }

    if (
      !confirm(
        `Konfirmasi perpanjangan ${title} (${durasiPilihan === 'TAHUNAN' ? '1 Tahun' : '1 Bulan'}) seharga Rp ${priceVal.toLocaleString('id-ID')} menggunakan Saldo Akun?`
      )
    ) {
      return;
    }

    setIsProcessing(true);
    setNotification(null);

    try {
      const res = await renewSubscriptionWithSaldo(
        owner.uid,
        owner.username || owner.uid,
        tier,
        days,
        priceVal
      );

      if (res.success) {
        const newExpired =
          res.newExpired ||
          Math.max(owner.tanggalLangganan || Date.now(), Date.now()) + days * 24 * 60 * 60 * 1000;

        onUpdateOwner({
          paketAktif: tier,
          saldo: currentSaldo - priceVal,
          tanggalLangganan: newExpired,
        });

        setNotification({
          type: 'success',
          message: `Selamat! Paket ${tier} berhasil diaktifkan kembali. Masa aktif diperpanjang hingga ${formatTanggalIndo(newExpired)}.`,
        });

        if (isTestPreview && onCloseTestMode) {
          setTimeout(() => onCloseTestMode(), 2000);
        }
      } else {
        setNotification({
          type: 'error',
          message: res.error || 'Gagal memperpanjang paket. Silakan hubungi admin.',
        });
      }
    } catch (e: any) {
      setNotification({
        type: 'error',
        message: e?.message || 'Terjadi kesalahan sistem saat memperpanjang paket.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenHelpWA = () => {
    const brand = owner.namaBrand || 'Studio';
    const ownerName = owner.namaOwner || 'Owner';
    const msg = [
      `Halo Admin Kafela's Agenda,`,
      '',
      `Saya *${ownerName}* dari *${brand}* (Username: ${owner.username || '-'}).`,
      `Masa aktif langganan studio saya telah berakhir.`,
      `Saldo Akun Saat Ini: Rp ${currentSaldo.toLocaleString('id-ID')}.`,
      `Saya ingin bantuan untuk perpanjangan paket studio saya.`,
      '',
      `Mohon info petunjuk pembayarannya. Terima kasih!`
    ].join('\n');

    window.open(`https://wa.me/6283132304649?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const handleContactOwnerForCrew = () => {
    const wa = (owner.noWhatsApp || '').replace(/[^0-9]/g, '');
    const cleanWa = wa.startsWith('0') ? '62' + wa.substring(1) : wa;
    const msg = `Halo ${owner.namaOwner || 'Owner'}, akun studio ${owner.namaBrand || ''} di Kafela's Agenda saat ini sedang habis masa aktif langganan. Mohon diperpanjang agar kru dapat mencatat jadwal kembali ya. Terima kasih!`;
    window.open(`https://wa.me/${cleanWa}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[150] overflow-y-auto bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-8 px-4 sm:px-6 select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-slate-950/80 to-slate-950 pointer-events-none" />

      {/* Test Mode Banner */}
      {isTestPreview && (
        <div className="w-full max-w-4xl mb-4 bg-amber-500/20 border border-amber-500/40 text-amber-200 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs font-semibold backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <span>Anda sedang melihat <b>Pratinjau / Simulasi Halaman Habis Langganan</b>.</span>
          </div>
          {onCloseTestMode && (
            <button
              type="button"
              onClick={onCloseTestMode}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer transition"
            >
              Tutup Pratinjau
            </button>
          )}
        </div>
      )}

      {/* Main Container Card */}
      <div className="relative w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl z-10 space-y-6">
        
        {/* TOP STATUS HEADER */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 border-b border-slate-800/80 pb-6 text-center sm:text-left">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <Clock className="w-9 h-9 sm:w-11 sm:h-11 text-white animate-pulse" />
          </div>

          <div className="flex-1 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Masa Aktif Berakhir</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Langganan Studio Anda Telah Habis
            </h1>
            <p className="text-sm text-slate-300">
              Studio: <span className="font-bold text-amber-400">{owner.namaBrand || "Kafela's Agenda"}</span>
              {owner.tanggalLangganan > 0 && (
                <span className="text-slate-400 text-xs ml-2">
                  (Berakhir pada {formatTanggalIndo(owner.tanggalLangganan)})
                </span>
              )}
            </p>
          </div>

          {/* Logout / Switch Account */}
          <div className="flex sm:flex-col items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onLogout}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
              title="Keluar dari sesi ini"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Ganti Akun</span>
            </button>
          </div>
        </div>

        {/* NOTIFIKASI TOAST / BANNER */}
        {notification && (
          <div
            className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
              notification.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                : 'bg-red-950/50 border-red-500 text-red-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* JAMINAN KEAMANAN DATA */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 text-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 text-center sm:text-left flex-1">
            <p className="font-bold text-slate-200 text-sm">Data Anda 100% Aman &amp; Terlindungi</p>
            <p className="text-slate-400 leading-relaxed">
              Seluruh riwayat jadwal booking, data klien, laporan keuangan, dan struk pembayaran tetap utuh tersimpan di cloud kami dan akan otomatis aktif kembali saat langganan diperpanjang.
            </p>
          </div>
        </div>

        {/* JIKA USER ADALAH ANGGOTA / KRU */}
        {isAnggota ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-center space-y-4">
            <Lock className="w-10 h-10 text-amber-400 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Akses Kru Dibatasi Sementara</h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Anda masuk sebagai <span className="font-bold text-amber-300">Kru / Anggota Tim</span>. Untuk mengaktifkan kembali jadwal dan fitur kasir, silakan hubungi Pemilik Studio (Owner) Anda.
              </p>
            </div>
            {owner.noWhatsApp && (
              <button
                type="button"
                onClick={handleContactOwnerForCrew}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20 transition"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Hubungi Owner Studio ({owner.namaOwner || 'Owner'})</span>
              </button>
            )}
          </div>
        ) : (
          /* JIKA USER ADALAH OWNER: TAMPILKAN PANEL TOP-UP & PILIHAN PAKET */
          <div className="space-y-6">

            {/* KARTU SALDO & TOMBOL TOP-UP */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-xl shrink-0">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Saldo Akun Studio Anda</span>
                  <span className="text-2xl sm:text-3xl font-mono font-extrabold text-amber-400">
                    Rp {currentSaldo.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTopUpOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/25 transition active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>+ Top-Up Saldo Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenHelpWA}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bantuan Admin</span>
                </button>
              </div>
            </div>

            {/* SELEKTOR BULANAN VS TAHUNAN */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Pilih Paket untuk Perpanjang Akun</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Pilih durasi paket yang sesuai dengan kebutuhan studio Anda.
                </p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setDurasiPilihan('BULANAN')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    durasiPilihan === 'BULANAN'
                      ? 'bg-slate-800 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bulanan (30 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => setDurasiPilihan('TAHUNAN')}
                  className={`px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    durasiPilihan === 'TAHUNAN'
                      ? 'bg-amber-500 text-slate-950 font-extrabold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Tahunan</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-600 text-white font-black">
                    HEMAT 20%
                  </span>
                </button>
              </div>
            </div>

            {/* GRID KARTU PILIHAN PAKET */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {DAFTAR_PAKET.map((pkt) => {
                const canAfford = currentSaldo >= pkt.priceVal;
                const isPreviousTier = owner.paketAktif.toLowerCase() === pkt.tier.toLowerCase();

                return (
                  <div
                    key={pkt.tier}
                    className={`rounded-2xl p-5 border flex flex-col justify-between transition-all relative ${
                      pkt.isPopular
                        ? 'bg-slate-900 border-sky-500/80 shadow-xl shadow-sky-500/10 ring-1 ring-sky-500/40'
                        : isPreviousTier
                        ? 'bg-slate-900/95 border-amber-500/50 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Badge Paket */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-base font-bold text-white">{pkt.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${pkt.badgeColor}`}>
                        {pkt.badge}
                      </span>
                    </div>

                    <div className="space-y-1 mb-4">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-mono font-extrabold text-white">
                          {pkt.priceLabel}
                        </span>
                        <span className="text-xs text-slate-400">{pkt.periodLabel}</span>
                      </div>
                      <p className="text-xs text-slate-400">{pkt.subtitle}</p>
                    </div>

                    {/* Fitur Utama */}
                    <div className="space-y-2 border-t border-slate-800/80 pt-3 mb-5 flex-1">
                      {pkt.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tombol Perpanjang / Top-up */}
                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {canAfford ? (
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => handleRenewWithSaldo(pkt.tier, pkt.days, pkt.priceVal, pkt.title)}
                          className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/20 transition active:scale-[0.98]"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>Perpanjang Pakai Saldo ({pkt.priceLabel})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsTopUpOpen(true)}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/40 transition hover:border-amber-400"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Top-Up Saldo untuk Paket Ini</span>
                        </button>
                      )}
                      <p className="text-[10px] text-center text-slate-500">
                        {canAfford
                          ? '✓ Saldo Anda mencukupi (Langsung Aktif Instan)'
                          : `Kurang Rp ${(pkt.priceVal - currentSaldo).toLocaleString('id-ID')} lagi`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR (MODE DARURAT BACA-SAJA) */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <HelpCircle className="w-4 h-4 text-slate-500" />
            <span>Butuh bantuan pembayaran atau aktivasi kilat?</span>
            <button
              type="button"
              onClick={handleOpenHelpWA}
              className="text-emerald-400 hover:text-emerald-300 underline font-semibold cursor-pointer"
            >
              Chat WhatsApp Admin
            </button>
          </div>

          {onEnterReadOnly && (
            <button
              type="button"
              onClick={onEnterReadOnly}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700 transition"
              title="Akses data agenda sebelumnya tanpa bisa membuat jadwal baru"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Masuk Sementara (Mode Baca-Saja)</span>
            </button>
          )}
        </div>
      </div>

      {/* MODAL TOP-UP SALDO REUSABLE */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        owner={owner}
      />
    </div>
  );
}
