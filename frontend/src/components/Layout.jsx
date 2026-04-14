import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  FileText,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
} from 'lucide-react';
import { useState } from 'react';

const SIDEBAR_WIDTH = 240; // px — shared by sidebar, header, content

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Clients',   href: '/clients',  icon: Building2 },
  { name: 'Calendar',  href: '/calendar', icon: Calendar },
  { name: 'Events',    href: '/events',   icon: FileText },
];

const adminNavigation = [
  { name: 'Users', href: '/users', icon: Users },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (href) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-ink-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ============ Sidebar (fixed 240px, full height) ============ */}
      <aside
        style={{ width: SIDEBAR_WIDTH }}
        className={`fixed top-0 left-0 h-screen z-50 flex flex-col
          bg-ink-900 text-ink-100 border-r border-ink-800
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        <div className="flex flex-col h-full bg-sidebar-glow">
          {/* Logo — height 40px, object-contain */}
          <div className="flex items-center gap-2.5 h-16 px-4 border-b border-ink-800">
            <Link to="/" className="flex items-center gap-2.5 w-full">
              <img
                src="/dhronai-logo.svg"
                alt="DhronAI"
                className="h-9 w-auto object-contain shrink-0"
                style={{ maxHeight: 40 }}
              />
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden text-ink-400 hover:text-white ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav — single consistent left padding, gap-3 between items */}
          <nav className="flex-1 px-3 py-5 flex flex-col gap-1 overflow-y-auto">
            <p className="px-3 mb-2 text-[10px] font-bold text-ink-500 uppercase tracking-widest">
              Workspace
            </p>
            {navigation.map((item) => (
              <SidebarLink
                key={item.name}
                item={item}
                active={isActive(item.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}

            {isAdmin && (
              <>
                <p className="px-3 mt-6 mb-2 text-[10px] font-bold text-ink-500 uppercase tracking-widest">
                  Admin
                </p>
                {adminNavigation.map((item) => (
                  <SidebarLink
                    key={item.name}
                    item={item}
                    active={isActive(item.href)}
                    onClick={() => setMobileOpen(false)}
                  />
                ))}
              </>
            )}
          </nav>

          {/* User pill */}
          <div className="p-3 border-t border-ink-800">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-ink-800/60">
              <div className="w-9 h-9 rounded-lg bg-brand-gradient flex items-center justify-center text-white text-sm font-bold shrink-0">
                {(user?.username?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                <p className="text-[11px] text-ink-400 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 text-ink-400 hover:text-white hover:bg-ink-700 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ============ Main wrapper — offset by sidebar width on lg+ ============ */}
      <div className="flex flex-col min-h-screen lg:ml-[240px]">
        {/* Header — aligned with content, same left offset via main-wrapper margin */}
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-ink-200/60">
          <div className="flex items-center justify-between gap-4 h-16 px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 -ml-2 rounded-lg text-ink-500 lg:hidden hover:text-ink-900 hover:bg-ink-100"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-ink-900 truncate leading-tight">
                  {getPageTitle(location.pathname)}
                </h1>
                <p className="text-xs text-ink-400 truncate">{getPageSubtitle(location.pathname)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 px-3 h-9 w-64 rounded-xl bg-ink-100/70 border border-ink-200/60 text-ink-500">
                <Search className="w-4 h-4" />
                <input
                  className="flex-1 bg-transparent outline-none text-sm placeholder-ink-400 text-ink-800"
                  placeholder="Search…"
                />
                <kbd className="hidden lg:inline text-[10px] font-mono bg-white border border-ink-200 rounded px-1.5 py-0.5 text-ink-400">⌘K</kbd>
              </div>

              <button className="relative p-2 rounded-xl text-ink-500 hover:text-ink-900 hover:bg-ink-100">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 ring-2 ring-white" />
              </button>

              <div className="flex items-center gap-2 px-2 h-9 rounded-xl bg-ink-100/70 border border-ink-200/60">
                <div className="w-7 h-7 rounded-lg bg-brand-gradient flex items-center justify-center text-white text-xs font-bold">
                  {(user?.username?.[0] || 'U').toUpperCase()}
                </div>
                <span className="text-sm font-medium text-ink-800 hidden sm:inline">{user?.username}</span>
                <span className="badge badge-success hidden md:inline">{user?.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content — consistent 24px padding */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all
        ${active
          ? 'bg-brand-gradient text-white shadow-glow-lg'
          : 'text-ink-300 hover:text-white hover:bg-ink-800'}
      `}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-ink-400 group-hover:text-white'}`} />
      <span className="truncate">{item.name}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />}
    </Link>
  );
}

function getPageTitle(pathname) {
  const titles = {
    '/': 'Dashboard',
    '/clients': 'Clients',
    '/clients/new': 'New Client',
    '/calendar': 'Calendar',
    '/events': 'Events',
    '/events/new': 'New Event',
    '/users': 'Users',
  };
  if (pathname.startsWith('/clients/') && pathname !== '/clients/new') return 'Client Details';
  if (pathname.startsWith('/events/')  && pathname !== '/events/new')  return 'Event Details';
  if (pathname.startsWith('/users/')   && pathname !== '/users/new')   return 'User Details';
  return titles[pathname] || 'CRMSarvam';
}

function getPageSubtitle(pathname) {
  if (pathname === '/')                 return 'Your AI-powered overview';
  if (pathname.startsWith('/clients'))  return 'Client directory & POCs';
  if (pathname.startsWith('/calendar')) return 'Events, follow-ups & deadlines';
  if (pathname.startsWith('/events'))   return 'Transcripts & AI intelligence';
  if (pathname.startsWith('/users'))    return 'Team & access management';
  return '';
}
