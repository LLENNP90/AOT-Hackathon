'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { api, User } from '@/lib/api';

const getInitials = (username: string) =>
  username
    .split(/[\s_\-\.]+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
};

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadError('');
        const res = await api.me();
        setUser(res.user);
        setUsername(res.user.username ?? '');
        setBusinessName(res.user.businessName ?? res.user.BusinessName ?? '');
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'FAILED_TO_LOAD_USER');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaveError('');

    if (newPassword && newPassword !== confirmPassword) {
      setSaveError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      const payload: { username?: string; businessName?: string; password?: string } = {
        username,
        businessName,
      };
      if (newPassword) payload.password = newPassword;

      const res = await api.updateMe(payload);
      setUser(res.user);
      setNewPassword('');
      setConfirmPassword('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'SAVE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  /* ── derived ─────────────────────────────────────────── */
  const initials = user ? getInitials(user.username) : '??';
  const displayBusiness = user?.businessName ?? user?.BusinessName ?? '';

  /* ── password mismatch ────────────────────────────────── */
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  /* ────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen w-full bg-[#0b0e14] text-white font-sans flex flex-col items-center justify-start px-4 py-10">

      {/* ── ambient glow ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-lg z-10">

        {/* ── header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex items-center gap-3 mb-8"
        >
          <a
            href="/home"
            id="profile-back-btn"
            aria-label="Back to home"
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </a>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Profile
          </h1>
        </motion.div>

        {/* ── loading ── */}
        <AnimatePresence>
          {loading && (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-20"
            >
              <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                Loading profile…
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── load error ── */}
        {!loading && loadError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm font-mono"
          >
            Error: {loadError}
          </motion.div>
        )}

        {/* ── main content ── */}
        <AnimatePresence>
          {!loading && !loadError && user && (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex flex-col gap-4"
            >

              {/* ── user info card ── */}
              <div className="bg-[#1e2130]/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4 relative overflow-hidden">
                {/* subtle inner gradient */}
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none"
                />

                {/* avatar */}
                <motion.div
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 18 }}
                  className="relative"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-black text-2xl tracking-wider shadow-[0_0_32px_rgba(59,130,246,0.35)] ring-4 ring-blue-500/20">
                    {initials}
                  </div>
                  {/* online dot */}
                  <span className="absolute bottom-1 right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[#1e2130]" />
                  </span>
                </motion.div>

                {/* user details */}
                <div className="text-center z-10">
                  <h2 className="text-lg font-bold text-white tracking-tight">{user.username}</h2>
                  {displayBusiness && (
                    <p className="text-xs font-mono text-blue-400 mt-0.5 tracking-wider uppercase">
                      {displayBusiness}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-500 mt-2 font-mono">
                    Member since {formatDate(user.createdAt)}
                  </p>
                </div>

                {/* decorative divider line */}
                <div className="w-full border-t border-white/5 pt-3 flex justify-center gap-8 z-10">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Account ID</span>
                    <span className="text-[11px] text-gray-300 font-mono">{user.id.slice(0, 8).toUpperCase()}…</span>
                  </div>
                  <div className="w-px bg-white/5" />
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Status</span>
                    <span className="text-[11px] text-emerald-400 font-mono font-bold">ACTIVE</span>
                  </div>
                </div>
              </div>

              {/* ── edit profile form ── */}
              <div className="bg-[#1e2130]/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <h3 className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                    Edit Profile
                  </h3>
                </div>

                <div className="flex flex-col gap-4">
                  {/* username */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-username" className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                      Username
                    </label>
                    <input
                      id="profile-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="Your username"
                    />
                  </div>

                  {/* business name */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-business" className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                      Business Name
                    </label>
                    <input
                      id="profile-business"
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="Your business name"
                    />
                  </div>

                  {/* divider */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 border-t border-white/5" />
                    <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Change Password</span>
                    <div className="flex-1 border-t border-white/5" />
                  </div>

                  {/* new password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-new-password" className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                      New Password <span className="text-gray-600 normal-case font-normal">(optional)</span>
                    </label>
                    <input
                      id="profile-new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-[#12141d] border border-white/10 rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                      placeholder="Leave blank to keep current"
                    />
                  </div>

                  {/* confirm password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="profile-confirm-password" className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                      Confirm Password
                    </label>
                    <input
                      id="profile-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`bg-[#12141d] border rounded-xl p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none transition-all ${
                        passwordMismatch
                          ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                          : 'border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30'
                      }`}
                      placeholder="Confirm new password"
                    />
                    <AnimatePresence>
                      {passwordMismatch && (
                        <motion.p
                          key="pw-mismatch"
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-[11px] text-red-400 font-mono"
                        >
                          Passwords do not match.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* save error */}
                <AnimatePresence>
                  {saveError && (
                    <motion.div
                      key="save-err"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-2.5 rounded-xl text-xs font-mono"
                    >
                      {saveError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* save button */}
                <motion.button
                  id="profile-save-btn"
                  onClick={handleSave}
                  disabled={saving || passwordMismatch}
                  whileTap={{ scale: 0.97 }}
                  className="relative w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all rounded-xl py-3 text-sm font-bold text-white tracking-wide overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {saveSuccess ? (
                      <motion.span
                        key="success"
                        initial={{ opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-emerald-300"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-emerald-300">Saved!</span>
                      </motion.span>
                    ) : saving ? (
                      <motion.span
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                        Saving…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        Save Changes
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* ── sign out section ── */}
              <div className="bg-[#1e2130]/50 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <h3 className="text-[10px] font-mono text-gray-400 uppercase font-bold tracking-widest">
                    Session
                  </h3>
                </div>

                <p className="text-xs text-gray-500 font-mono leading-relaxed">
                  Signing out will end your current session. You will need to log in again to access the dashboard.
                </p>

                <motion.button
                  id="profile-logout-btn"
                  onClick={handleLogout}
                  whileTap={{ scale: 0.97 }}
                  className="w-full bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-400 hover:text-white active:scale-95 transition-all rounded-xl py-3 text-sm font-bold tracking-wide flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Sign Out
                </motion.button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
