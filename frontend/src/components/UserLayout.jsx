import { useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, List, Wallet, User as UserIcon, LogOut, Moon, Sun, ArrowLeft, Tag } from 'lucide-react';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';

const UserLayout = () => {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const { cartCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;
  const showBackButton = location.pathname !== '/user' && location.pathname !== '/user/canteen/1/menu';

  // Push notification setup
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    if (!user) return;

    const API_URL = import.meta.env.VITE_API_URL || '';
    const socket = io(API_URL);

    socket.on('connect', () => {
      socket.emit('join_user', { user_id: user.id });
    });

    socket.on('user_notification', (data) => {
      // Show toast
      if (data.status === 'ready') {
        toast.success(data.body, { duration: 5000, icon: '🎉' });
      } else {
        toast(data.body, { icon: 'ℹ️' });
      }

      // Show native browser push notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.body,
          icon: '/favicon.ico' // Or any app icon
        });
      }
    });

    return () => socket.disconnect();
  }, [user]);

  return (
    <div className="page-container">
      {/* Top Navbar */}
      <header className="glass-panel" style={{ 
        position: 'sticky', top: 0, zIndex: 50, padding: '1rem', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {showBackButton && (
            <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 0, display: 'flex', alignItems: 'center' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h2 className="text-brand" style={{ margin: 0, fontFamily: 'Outfit' }}>Breakzo</h2>
        </div>
        
        {/* Desktop Navigation Links */}
        <div className="desktop-only">
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', fontWeight: 500 }}>
            <Link to="/user" style={{ color: isActive('/user') ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>Home</Link>
            <Link to="/user/offers" style={{ color: isActive('/user/offers') ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>Offers</Link>
            <Link to="/user/orders" style={{ color: isActive('/user/orders') ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>Orders</Link>
            <Link to="/user/wallet" style={{ color: isActive('/user/wallet') ? 'var(--brand-primary)' : 'var(--text-secondary)' }}>Wallet</Link>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={toggleTheme} className="btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div style={{ textAlign: 'right', display: 'none' }} className="desktop-only">
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Balance: ₹{user?.wallet_balance}</div>
          </div>
          
          <button onClick={logout} className="btn-outline btn-sm desktop-only">Logout</button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container" style={{ paddingTop: '2rem' }}>
        <Outlet />
      </main>

      <nav className="glass-panel" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around', padding: '0.75rem 0',
        borderBottom: 'none', borderLeft: 'none', borderRight: 'none', borderRadius: '1rem 1rem 0 0',
        zIndex: 50
      }}>
        <Link to="/user" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isActive('/user') ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
          <Home size={24} />
          <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Home</span>
        </Link>
        <Link to="/user/offers" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isActive('/user/offers') ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
          <Tag size={24} />
          <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Offers</span>
        </Link>
        <Link to="/user/orders" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isActive('/user/orders') ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
          <List size={24} />
          <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Orders</span>
        </Link>
        <Link to="/user/wallet" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isActive('/user/wallet') ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
          <Wallet size={24} />
          <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Wallet</span>
        </Link>
        <Link to="/user/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: isActive('/user/profile') ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
          <UserIcon size={24} />
          <span style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>Profile</span>
        </Link>
      </nav>
      
      <style>{`
        @media (min-width: 768px) {
          nav { display: none !important; }
          .desktop-only { display: block !important; }
        }
        @media (max-width: 767px) {
          .desktop-only { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default UserLayout;
