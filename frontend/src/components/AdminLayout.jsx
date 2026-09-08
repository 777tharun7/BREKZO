import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ChefHat, Utensils, Tag, RotateCcw, MessageSquare, Trash2, Leaf, LogOut, Menu as MenuIcon, X, ArrowLeft, List, History, Package } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const AdminLayout = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path) => location.pathname === path;
  const showBackButton = location.pathname !== '/admin';
  
  const navItems = [
    { path: '/admin', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
    { path: '/admin/kitchen', icon: <ChefHat size={20} />, label: 'Kitchen Display' },
    { path: '/admin/orders', icon: <List size={20} />, label: 'Order History' },
    { path: '/admin/menu', icon: <Utensils size={20} />, label: 'Menu Manager' },
    { path: '/admin/offers', icon: <Tag size={20} />, label: 'Offers & Promos' },
    { path: '/admin/refunds', icon: <RotateCcw size={20} />, label: 'Refunds' },
    { path: '/admin/reviews', icon: <MessageSquare size={20} />, label: 'Reviews' },
    { path: '/admin/waste', icon: <Trash2 size={20} />, label: 'Waste Log' },
    { path: '/admin/sustainability', icon: <Leaf size={20} />, label: 'Sustainability' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} style={{
        width: '280px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 50,
        transition: 'transform 0.3s ease',
      }}>
        <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-brand" style={{ margin: 0 }}>Breakzo Admin</h2>
          <button className="mobile-only" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                backgroundColor: isActive(item.path) ? 'rgba(255, 107, 53, 0.1)' : 'transparent',
                color: isActive(item.path) ? 'var(--brand-primary)' : 'var(--text-secondary)',
                fontWeight: isActive(item.path) ? 600 : 500,
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
          <Link to="/admin/history" className={`flex-center ${isActive('/admin/history') ? 'text-brand' : 'text-muted'}`} style={{ flexDirection: 'column' }}>
            <History size={24} />
            <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>History</span>
          </Link>
          <Link to="/admin/inventory" className={`flex-center ${isActive('/admin/inventory') ? 'text-brand' : 'text-muted'}`} style={{ flexDirection: 'column' }}>
            <Package size={24} />
            <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Inventory</span>
          </Link>
          <button onClick={logout} className="btn btn-outline" style={{ width: '100%', marginTop: '1rem' }}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="admin-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Topbar */}
        <header className="glass-panel" style={{ 
          padding: '1rem 1.5rem', 
          display: 'flex', 
          alignItems: 'center',
          gap: '1rem',
          borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0,
          position: 'sticky', top: 0, zIndex: 30
        }}>
          <button className="mobile-only" onClick={() => setSidebarOpen(true)}>
            <MenuIcon size={24} />
          </button>
          {showBackButton && (
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 0, display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h3 style={{ margin: 0 }}>Admin Portal</h3>
        </header>

        <main style={{ padding: '1.5rem', flex: 1, overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .admin-sidebar { transform: translateX(0); }
        .mobile-only { display: none; }
        .admin-content { margin-left: 280px; }
        
        @media (max-width: 1024px) {
          .admin-sidebar { transform: translateX(-100%); }
          .admin-sidebar.open { transform: translateX(0); }
          .admin-content { margin-left: 0; }
          .mobile-only { display: block; background: none; border: none; color: var(--text-primary); }
        }
      `}</style>
    </div>
  );
};

export default AdminLayout;
