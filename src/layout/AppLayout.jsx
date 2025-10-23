// AppLayout.jsx
import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  // Close on Escape (mobile)
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closeSidebar();
    }
    if (sidebarOpen) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen, closeSidebar]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      <div
        aria-hidden
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity md:hidden ${
          sidebarOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeSidebar}
      />

      {/* Sidebar (drawer on < md, static on md+) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-surface border-r border-border transition-transform duration-300 ease-out md:static md:translate-x-0 md:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal={sidebarOpen ? 'true' : undefined}
        aria-label="Navigation"
      >
        <Sidebar onNavigate={closeSidebar} />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onMenuClick={toggleSidebar} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
