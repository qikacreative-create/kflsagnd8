import React, { useRef, useState } from 'react';
import {
  Eye,
  EyeOff,
  Lock,
  Phone,
  Play,
  User,
  X,
} from 'lucide-react';
import { UserRoleType } from '../types/kafela';
import { ProfessionPresetKey } from '../services/demoDataSeeder';
import {
  loginFirebaseWithGoogle,
  loginFirebaseWithWA,
  signupFirebaseWithWA,
} from '../services/firebaseClient';
import { PWAInstallFloatingBanner } from '../hooks/usePWAInstall';

interface LoginAndSetupScreenProps {
  onStartDemo: (preset: ProfessionPresetKey) => void;
  onLoginFirebaseSuccess: (session: {
    uid: string;
    targetOwnerId: string;
    role: UserRoleType;
    displayName: string;
  }) => void;
  onOpenSuperAdmin?: () => void;
}

export const LoginAndSetupScreen: React.FC<LoginAndSetupScreenProps> = ({
  onStartDemo,
  onLoginFirebaseSuccess,
  onOpenSuperAdmin,
}) => {
  const [authTab, setAuthTab] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [waInput, setWaInput] = useState('');
  const [password, setPassword] = useState('');
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
  const [namaOwner, setNamaOwner] = useState('');
  const [namaBrand, setNamaBrand] = useState('');
  const [setujuSyarat, setSetujuSyarat] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSyaratModal, setShowSyaratModal] = useState(false);
  const [showDemoPickerModal, setShowDemoPickerModal] = useState(false);

  // Stealth Trigger untuk Super Admin (5x ketukan cepat pada versi v.4.16)
  const tapCountRef = useRef<number>(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretVersionTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      if (onOpenSuperAdmin) {
        onOpenSuperAdmin();
      }
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2500);
    }
  };

  const formatAuthError = (err: unknown, isSignup = false): string => {
    const raw = err instanceof Error ? err.message : String(err);
    const m = raw.toLowerCase();
    if (m.includes('invalid-email') || m.includes('invalid email')) {
      return 'Format nomor WhatsApp atau email tidak valid. Masukkan nomor WhatsApp yang benar (minimal 9-10 digit angka).';
    }
    if (m.includes('invalid-credential') || m.includes('user-not-found') || m.includes('wrong-password')) {
      return isSignup
        ? 'Format data pendaftaran tidak valid.'
        : 'Nomor WhatsApp atau Kata Sandi salah. Jika belum pernah mendaftar di database Firebase ini, silakan klik tombol "Daftar di sini" di bawah';
    }
    if (m.includes('email-already-in-use')) {
      return 'Nomor WhatsApp ini sudah terdaftar. Silakan gunakan menu "Masuk (Login)" atau masukkan kata sandi yang sesuai.';
    }
    if (m.includes('weak-password')) {
      return 'Kata sandi terlalu pendek. Minimal 6 karakter.';
    }
    if (m.includes('network-request-failed')) {
      return 'Gagal terhubung ke Firebase. Periksa jaringan internet Anda';
    }
    if (m.includes('too-many-requests')) {
      return 'Terlalu banyak percobaan gagal. Silakan tunggu beberapa saat.';
    }
    if (m.includes('popup-closed-by-user')) {
      return 'Jendela popup Google ditutup. Silakan coba lagi atau gunakan login nomor WhatsApp.';
    }
    if (m.includes('unauthorized-domain') || m.includes('not authorized')) {
      return 'Domain preview belum didaftarkan di Firebase Console -> Authentication -> Authorized Domains. Silakan masuk menggunakan Nomor WhatsApp & Sandi';
    }
    if (m.includes('operation-not-allowed')) {
      return 'Login Email/Password belum diaktifkan di proyek Firebase kafilasuci3. Silakan masuk menggunakan tombol "Masuk dengan Google", atau aktifkan metode Email/Password di Firebase Console -> Authentication -> Sign-in method.';
    }
    if (m.includes('belum siap')) {
      return 'Konfigurasi Firebase belum siap. Silakan muat ulang halaman.';
    }
    return raw;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!waInput.trim() || !password.trim()) {
      setErrorMsg('Harap isi Nomor WhatsApp atau ID Login dan Kata Sandi!');
      return;
    }
    if (!setujuSyarat) {
      setErrorMsg('Anda harus mencentang persetujuan Syarat & Ketentuan terlebih dahulu.');
      return;
    }

    try {
      setLoading(true);
      const session = await loginFirebaseWithWA(waInput, password);
      onLoginFirebaseSuccess(session);
    } catch (err: unknown) {
      setErrorMsg(formatAuthError(err, false));
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!namaOwner.trim() || !namaBrand.trim() || !waInput.trim() || !password.trim()) {
      setErrorMsg('Harap lengkapi semua kolom pendaftaran!');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter!');
      return;
    }
    if (password !== konfirmasiPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok!');
      return;
    }
    if (!setujuSyarat) {
      setErrorMsg('Anda harus menyetujui Syarat & Ketentuan layanan.');
      return;
    }

    try {
      setLoading(true);
      const session = await signupFirebaseWithWA(namaOwner, namaBrand, waInput, password);
      onLoginFirebaseSuccess(session);
    } catch (err: unknown) {
      setErrorMsg(formatAuthError(err, true));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    if (!setujuSyarat) {
      setErrorMsg('Silakan centang persetujuan Syarat & Ketentuan terlebih dahulu!');
      return;
    }

    try {
      setLoading(true);
      const session = await loginFirebaseWithGoogle();
      onLoginFirebaseSuccess(session);
    } catch (err: unknown) {
      setErrorMsg(formatAuthError(err, false));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 select-none"
      style={{ backgroundColor: '#121212', color: '#FFFFFF' }}
    >
      {/* KARTU TENGAH PERSIS activity_login.xml & activity_signup.xml */}
      <div
        className="w-full max-w-[440px] rounded-2xl p-6 sm:p-8 shadow-2xl border"
        style={{ backgroundColor: '#1E1E1E', borderColor: '#2E2E2E' }}
      >
        {authTab === 'LOGIN' ? (
          <>
            {/* Header Login persis activity_login.xml + Logo Resmi kafela's Agenda */}
            <div className="text-center mb-8">
              <img
                src="/pwa-512x512.png"
                alt="kafela's Agenda"
                className="w-24 h-24 mx-auto mb-3 rounded-full shadow-xl border-2 border-amber-500/40 bg-[#FAF9F6] object-contain object-center p-1"
              />
              <h1
                className="font-bold tracking-tight"
                style={{ fontSize: '30px', color: '#FFFFFF' }}
              >
                Kafela&apos;s Agenda
              </h1>
              <p className="mt-1.5" style={{ fontSize: '14px', color: '#AAAAAA' }}>
                Silakan masuk ke akun Anda
              </p>
                     <div className="mt-0 text-center select-none">
          <span
            onClick={handleSecretVersionTap}
            className="text-[11px] text-slate-500 font-mono tracking-wider cursor-default hover:text-slate-400 transition-colors inline-block  rounded"
            title="Kafela's Agenda"
          >
            v.4.16
          </span>
        </div>
            </div>

            

            {errorMsg && (
              <div
                className="mb-4 rounded-xl p-3 text-xs leading-relaxed border"
                style={{
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  borderColor: '#E74C3C',
                  color: '#FFB4AB',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Input Nomor WhatsApp / Username ID */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#AAAAAA' }}>
                  Username atau Nomor WhatsApp
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-3 focus-within:border-[#64B5F6] transition-colors"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <User className="w-4 h-4 mr-3 shrink-0" style={{ color: '#888888' }} />
                  <input
                    type="text"
                    placeholder="Username atau Nomor WhatsApp"
                    value={waInput}
                    onChange={(e) => setWaInput(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                </div>
              </div>

              {/* Input Kata Sandi */}
              <div>
                <label className="block text-xs mb-1.5" style={{ color: '#AAAAAA' }}>
                  Kata Sandi
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-3 focus-within:border-[#64B5F6] transition-colors"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <Lock className="w-4 h-4 mr-3 shrink-0" style={{ color: '#888888' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Masukkan kata sandi"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 text-[#888888] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Checkbox Syarat & Ketentuan */}
              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setujuSyarat}
                    onChange={(e) => setSetujuSyarat(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#64B5F6]"
                  />
                  <span style={{ fontSize: '13px', color: '#CCCCCC' }}>
                    Saya menyetujui Syarat &amp; Ketentuan
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSyaratModal(true)}
                  className="ml-6 mt-0.5 text-left font-bold hover:underline cursor-pointer"
                  style={{ fontSize: '12px', color: '#64B5F6' }}
                >
                  Baca Ketentuan Layanan dan Kebijakan Privasi
                </button>
              </div>

              {/* Tombol MASUK (cornerRadius="30dp", height="55dp") */}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-lg mt-2"
                style={{
                  height: '52px',
                  borderRadius: '30px',
                  backgroundColor: '#2980B9',
                  fontSize: '15px',
                }}
              >
                {loading ? 'MEMUAT DATA...' : 'MASUK'}
              </button>

              {/* Divider ATAU */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px" style={{ backgroundColor: '#333333' }} />
                <span className="font-bold" style={{ fontSize: '12px', color: '#666666' }}>
                  ATAU
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#333333' }} />
              </div>

              {/* Tombol Masuk / Daftar Cepat via Google (#2C2C2C) */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full font-bold text-white transition-colors hover:bg-[#363636] cursor-pointer border"
                style={{
                  height: '52px',
                  borderRadius: '30px',
                  backgroundColor: '#2C2C2C',
                  borderColor: '#3E3E3E',
                  fontSize: '14px',
                }}
              >
                Masuk / Daftar Cepat via Google
              </button>

              {/* Belum punya akun? Daftar di sini */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthTab('SIGNUP');
                  }}
                  className="font-bold hover:underline cursor-pointer py-2"
                  style={{ fontSize: '14px', color: '#64B5F6' }}
                >
                  Belum punya akun? Daftar di sini
                </button>
              </div>

              {/* TOMBOL MASUK MODE DEMO (JADWAL TERISI) */}
              <div className="pt-3 border-t border-[#333333] text-center">
                <button
                  type="button"
                  onClick={() => setShowDemoPickerModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow"
                >
                  <Play className="w-4 h-4 fill-amber-300" />
                  <span>Coba Mode Demo (Jadwal Terisi)</span>
                </button>
                <p className="mt-1.5 text-[11px] text-[#888888]">
                  Uji coba langsung agenda, kasir, dan cetak struk tanpa perlu login
                </p>
              </div>
            </form>
          </>
        ) : (
          /* FORM DAFTAR AKUN BARU PERSIS activity_signup.xml */
          <>
            <div className="text-center mb-6">
              <img
                src="/pwa-512x512.png"
                alt="kafela's Agenda"
                className="w-20 h-20 mx-auto mb-2.5 rounded-full shadow-lg border-2 border-amber-500/40 bg-[#FAF9F6] object-contain object-center p-1"
              />
              <h1
                className="font-bold tracking-tight"
                style={{ fontSize: '26px', color: '#FFFFFF' }}
              >
                Buat Akun Baru
              </h1>
              <p className="mt-1" style={{ fontSize: '14px', color: '#AAAAAA' }}>
                Daftar untuk mulai mengelola jadwal
              </p>
            </div>

            {errorMsg && (
              <div
                className="mb-4 rounded-xl p-3 text-xs leading-relaxed border"
                style={{
                  backgroundColor: 'rgba(231, 76, 60, 0.15)',
                  borderColor: '#E74C3C',
                  color: '#FFB4AB',
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs mb-1" style={{ color: '#AAAAAA' }}>
                  Nama Lengkap (Owner)
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-2.5"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <User className="w-4 h-4 mr-2.5 shrink-0" style={{ color: '#888888' }} />
                  <input
                    type="text"
                    placeholder="Nama Lengkap (Owner)"
                    value={namaOwner}
                    onChange={(e) => setNamaOwner(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: '#AAAAAA' }}>
                  Nama Brand / Usaha
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-2.5"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <input
                    type="text"
                    placeholder="Contoh: Kafela Creative"
                    value={namaBrand}
                    onChange={(e) => setNamaBrand(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: '#AAAAAA' }}>
                  Nomor WhatsApp atau Email
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-2.5"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <Phone className="w-4 h-4 mr-2.5 shrink-0" style={{ color: '#888888' }} />
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890 / email@gmail.com"
                    value={waInput}
                    onChange={(e) => setWaInput(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: '#AAAAAA' }}>
                  Buat Kata Sandi
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-2.5"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <Lock className="w-4 h-4 mr-2.5 shrink-0" style={{ color: '#888888' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-2 text-[#888888] hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: '#AAAAAA' }}>
                  Konfirmasi Kata Sandi
                </label>
                <div
                  className="flex items-center rounded-lg border px-3.5 py-2.5"
                  style={{ backgroundColor: '#161616', borderColor: '#3A3A3A' }}
                >
                  <Lock className="w-4 h-4 mr-2.5 shrink-0" style={{ color: '#888888' }} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi kata sandi"
                    value={konfirmasiPassword}
                    onChange={(e) => setKonfirmasiPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-white placeholder-[#666666] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="ml-2 text-[#888888] hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setujuSyarat}
                    onChange={(e) => setSetujuSyarat(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#64B5F6]"
                  />
                  <span style={{ fontSize: '13px', color: '#CCCCCC' }}>
                    Saya menyetujui Syarat &amp; Ketentuan
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowSyaratModal(true)}
                  className="ml-6 mt-0.5 text-left font-bold hover:underline cursor-pointer"
                  style={{ fontSize: '12px', color: '#64B5F6' }}
                >
                  Baca Ketentuan Layanan dan Kebijakan Privasi
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-lg mt-2"
                style={{
                  height: '52px',
                  borderRadius: '30px',
                  backgroundColor: '#27AE60',
                  fontSize: '15px',
                }}
              >
                {loading ? 'MENDAFTARKAN...' : 'DAFTAR SEKARANG'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthTab('LOGIN');
                  }}
                  className="font-bold hover:underline cursor-pointer py-1.5"
                  style={{ fontSize: '14px', color: '#64B5F6' }}
                >
                  Sudah punya akun? Masuk di sini
                </button>
              </div>
            </form>
          </>
        )}

 

      </div>

      <PWAInstallFloatingBanner />

      {/* MODAL SYARAT & KETENTUAN (Persis tampilkanDialogKetentuan di LoginActivity.kt) */}
      {showSyaratModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div
            className="w-full max-w-lg rounded-2xl p-6 text-white space-y-4 border"
            style={{ backgroundColor: '#1E1E1E', borderColor: '#333333' }}
          >
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <h3 className="text-base font-bold">Ketentuan Layanan &amp; Privasi</h3>
              <button
                type="button"
                onClick={() => setShowSyaratModal(false)}
                className="p-1 rounded-lg text-[#AAAAAA] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#CCCCCC] leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <p className="font-bold text-white">Selamat datang di Kafela&apos;s Agenda!</p>
              <p>
                <strong>1. Keamanan &amp; Privasi Data:</strong> Kami berkomitmen menjaga privasi
                Anda. Seluruh data jadwal, transaksi, dan kontak klien yang Anda masukkan tersimpan
                di server Google Firebase dan hanya digunakan untuk keperluan manajemen bisnis Anda
                sendiri.
              </p>
              <p>
                <strong>2. Rahasia Perusahaan:</strong> Kami tidak akan pernah menjual, menyewakan,
                atau membagikan data pelanggan maupun omset bisnis Anda kepada pihak ketiga manapun.
              </p>
              <p>
                <strong>3. Tanggung Jawab Pengguna:</strong> Anda bertanggung jawab penuh atas
                keamanan kata sandi akun Anda, termasuk akun staf/admin yang Anda buat di dalam menu
                Kelola Tim.
              </p>
              <p>
                <strong>4. Layanan Berlangganan:</strong> Fitur aplikasi disesuaikan dengan paket
                langganan aktif Anda (Trial, Basic, Pro, atau Ultimate).
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setShowSyaratModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#AAAAAA] hover:bg-[#2C2C2C] cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setSetujuSyarat(true);
                  setShowSyaratModal(false);
                }}
                className="px-4 py-2 rounded-lg bg-[#2980B9] text-xs font-bold text-white cursor-pointer"
              >
                Saya Setuju
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PILIHAN PRESET PROFESI MODE DEMO */}
      {showDemoPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md rounded-2xl p-6 text-white space-y-4 border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            style={{ backgroundColor: '#1E1E1E', borderColor: '#333333' }}
          >
            <div className="flex items-center justify-between border-b border-[#333333] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🚀</span> Pilih Bidang Usaha Demo
                </h3>
                <p className="text-xs text-[#AAAAAA] mt-0.5">
                  Setiap opsi sudah dilengkapi jadwal, kasir, paket, dan booking web
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDemoPickerModal(false)}
                className="p-1 rounded-lg text-[#AAAAAA] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {[
                {
                  key: 'FOTO' as ProfessionPresetKey,
                  icon: '📸',
                  title: 'Studio Foto & Fotografi',
                  sub: 'Wisuda, Self Photo, Wedding, Pas Foto',
                  color: 'hover:border-sky-500/60 hover:bg-sky-500/10',
                },
                {
                  key: 'MUA' as ProfessionPresetKey,
                  icon: '💄',
                  title: 'MUA & Rias Pengantin',
                  sub: 'Bridal, Wisuda, Hijabdo, Henna',
                  color: 'hover:border-purple-500/60 hover:bg-purple-500/10',
                },
                {
                  key: 'WO' as ProfessionPresetKey,
                  icon: '💍',
                  title: 'Wedding Organizer (WO)',
                  sub: 'Rundown Akad, Resepsi, All-In Planner',
                  color: 'hover:border-emerald-500/60 hover:bg-emerald-500/10',
                },
                {
                  key: 'MC' as ProfessionPresetKey,
                  icon: '🎤',
                  title: 'MC & Event Protocol',
                  sub: 'Host Wedding, Corporate, Sound System',
                  color: 'hover:border-amber-500/60 hover:bg-amber-500/10',
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setShowDemoPickerModal(false);
                    onStartDemo(item.key);
                  }}
                  className={`p-3.5 rounded-xl border border-[#333333] bg-[#161616] text-left transition-all cursor-pointer flex flex-col justify-between group ${item.color}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="font-bold text-xs text-white group-hover:text-amber-300 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#888888] leading-tight">
                    {item.sub}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[10px] text-[#AAAAAA] pt-2 border-t border-white/5">
                    <span>Data Siap Pakai</span>
                    <span className="text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                      Mulai Demo →
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 text-center border-t border-[#333333]">
              <button
                type="button"
                onClick={() => setShowDemoPickerModal(false)}
                className="px-4 py-2 rounded-lg text-xs text-[#888888] hover:text-white cursor-pointer"
              >
                Kembali ke Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
