// ============================================================================
// SHOREBREAK AI - LAYOUT PRINCIPAL
// ============================================================================

import { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap, 
  Archive, 
  Settings, 
  Shield, 
  Menu, 
  X, 
  LogOut 
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn, getInitials } from '../../lib/utils';

// ----------------------------------------------------------------------------
// Navigation Items
// ----------------------------------------------------------------------------

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Automations', path: '/automations', icon: Zap },
  { label: 'Archives', path: '/archives', icon: Archive },
  { label: 'Settings', path: '/settings', icon: Settings },
];

// ----------------------------------------------------------------------------
// Layout Component
// ----------------------------------------------------------------------------

export function Layout() {
  const navigate = useNavigate();
  const { profile, signOut, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="h-screen bg-[#FAFAFA] flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Compact */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-56',
          'bg-white border-r border-slate-200',
          'transform transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="h-full flex flex-col">
          {/* Logo - Compact */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
            <div className="flex items-center">
              <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center mr-2.5 shadow-md">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-base text-slate-900 tracking-tight">
                Shorebreak.AI
              </span>
            </div>
            {/* Close button mobile */}
            <button
              className="lg:hidden text-slate-400 hover:text-slate-600"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation - Compact */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-slate-50 text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <item.icon className="w-4 h-4 mr-2.5" />
                {item.label}
              </NavLink>
            ))}

            {/* Admin Link - Only visible to admins */}
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-slate-50 text-slate-900 shadow-sm border border-slate-200'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                <Shield className="w-4 h-4 mr-2.5" />
                Admin
              </NavLink>
            )}
          </nav>

          {/* User Profile Footer - Compact */}
          <div className="p-3 border-t border-slate-100">
            <div className="flex items-center gap-2.5 px-2 mb-3">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <span className="text-xs font-medium text-slate-600">
                  {getInitials(profile?.full_name || '')}
                </span>
              </div>
              <div className="text-sm flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate text-sm">
                  {profile?.full_name || 'User'}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {profile?.role || 'user'}
                </div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4">
          <span className="font-bold text-slate-900">Shorebreak.AI</span>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-slate-600"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content - Optimized padding */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto h-full">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}

export default Layout;
