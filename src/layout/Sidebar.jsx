import {
  Home,
  BookOpen,
  CheckSquare,
  Calendar,
  Settings,
  X,
} from 'lucide-react';

const nav = [
  { label: 'Dashboard', icon: Home },
  { label: 'Courses', icon: BookOpen },
  { label: 'Tasks', icon: CheckSquare },
  { label: 'Calendar', icon: Calendar },
  { label: 'Settings', icon: Settings },
];

export default function Sidebar({ onNavigate }) {
  return (
    <div className="h-full w-64 flex flex-col bg-surface">
      {/* Mobile-only close bar */}
      <div className="md:hidden h-14 flex items-center justify-between px-4 border-b border-border">
        <span className="text-base font-semibold">Study App</span>
        <button
          onClick={() => onNavigate?.()}
          className="p-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Logo / Brand (desktop) */}
      <div className="hidden md:flex h-14 items-center px-6 text-xl font-semibold text-primary-600 tracking-tight border-b border-border">
        Study App
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 md:py-6 space-y-1 overflow-y-auto">
        {nav.map((item) => (
          <a
            key={item.label}
            href="#"
            onClick={() => onNavigate?.()}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-text-700 hover:bg-muted hover:text-primary-700 transition-colors"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
