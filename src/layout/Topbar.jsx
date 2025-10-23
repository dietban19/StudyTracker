// Topbar.jsx
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  User,
  Menu,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Topbar({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const avatarSrc = user?.photoURL || null;

  const menuRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <header className="sticky top-0 z-20 h-14 flex items-center justify-between px-3 sm:px-6 border-b border-border bg-surface">
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile menu button */}
        <button
          className="md:hidden p-2 -ml-1 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-text-900 truncate">
            Study Tracker
          </span>
          <span className="hidden sm:inline text-sm text-text-500">
            Dashboard
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-4 relative" ref={menuRef}>
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-text-700" />
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary-500" />
        </button>

        {/* Profile */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg p-1 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt="avatar"
              referrerPolicy="no-referrer"
              className="h-8 w-8 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="h-8 w-8 flex items-center justify-center rounded-full border border-border bg-muted">
              <User className="h-5 w-5 text-text-500" />
            </div>
          )}
          <ChevronDown
            className={`h-4 w-4 text-text-500 transition-transform ${
              open ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <div
            role="menu"
            className="absolute right-0 top-12 w-44 rounded-xl border border-border bg-surface shadow-lg py-2"
          >
            <a
              href="#"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-700 hover:bg-muted"
            >
              <User className="h-4 w-4 text-text-500" />
              Profile
            </a>
            <a
              href="#"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-700 hover:bg-muted"
            >
              <SettingsIcon className="h-4 w-4 text-text-500" />
              Settings
            </a>
            <hr className="my-1 border-border" />
            <a
              href="#"
              role="menuitem"
              className="flex items-center gap-2 px-4 py-2 text-sm text-danger-600 hover:bg-danger-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
