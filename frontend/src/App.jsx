import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Layouts
import UserLayout from './components/UserLayout';
import AdminLayout from './components/AdminLayout';

// User Pages
import LoginOTP from './pages/user/LoginOTP';
import MultiCanteen from './pages/user/MultiCanteen';
import Menu from './pages/user/Menu';
import OffersAndCoupons from './pages/user/OffersAndCoupons';
import OrderTracker from './pages/user/OrderTracker';
import WalletAndLoyalty from './pages/user/WalletAndLoyalty';
import UserActivity from './pages/user/UserActivity';
import StudentProfile from './pages/user/StudentProfile';
import WeatherVibe from './pages/user/WeatherVibe';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import KitchenDashboard from './pages/admin/KitchenDashboard';
import AdminMenuManager from './pages/admin/AdminMenuManager';
import AdminOrderHistory from './pages/admin/AdminOrderHistory';
import AdminInventory from './pages/admin/AdminInventory';
import AdminOffersManager from './pages/admin/AdminOffersManager';
import AdminRefunds from './pages/admin/AdminRefunds';
import AdminReviews from './pages/admin/AdminReviews';
import AdminSupplierWaste from './pages/admin/AdminSupplierWaste';
import SustainabilityDashboard from './pages/admin/SustainabilityDashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex-center" style={{ height: '100vh' }}>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginOTP />} />
        
        {/* Root Redirect */}
        <Route path="/" element={<Navigate to={user ? (user.role === 'admin' ? '/admin' : '/user') : '/login'} />} />
        
        {/* Legacy Route Redirects (for page refreshes/bookmarks) */}
        <Route path="/canteen/:id/menu" element={<Navigate to="/user" replace />} />
        <Route path="/orders" element={<Navigate to="/user/orders" replace />} />
        <Route path="/orders/:id" element={<Navigate to="/user/orders" replace />} />
        <Route path="/wallet" element={<Navigate to="/user/wallet" replace />} />
        <Route path="/profile" element={<Navigate to="/user/profile" replace />} />
        
        {/* User Routes */}
        <Route path="/user" element={<UserLayout />}>
          <Route index element={user && user.role !== 'admin' ? <Navigate to="canteen/1/menu" replace /> : <Navigate to={user?.role === 'admin' ? '/admin' : '/login'} />} />
          <Route path="canteen/:id/menu" element={user ? <Menu /> : <Navigate to="/login" />} />
          <Route path="wallet" element={user ? <WalletAndLoyalty /> : <Navigate to="/login" />} />
          <Route path="offers" element={user ? <OffersAndCoupons /> : <Navigate to="/login" />} />
          <Route path="orders" element={user ? <UserActivity /> : <Navigate to="/login" />} />
          <Route path="orders/:id" element={user ? <OrderTracker /> : <Navigate to="/login" />} />
          <Route path="profile" element={user ? <StudentProfile /> : <Navigate to="/login" />} />
          <Route path="discover" element={user ? <WeatherVibe /> : <Navigate to="/login" />} />
        </Route>
        
        {/* Admin Routes */}
        <Route path="/admin" element={user && user.role === 'admin' ? <AdminLayout /> : <Navigate to="/login" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="kitchen" element={<KitchenDashboard />} />
          <Route path="orders" element={<AdminOrderHistory />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="menu" element={<AdminMenuManager />} />
          <Route path="offers" element={<AdminOffersManager />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="waste" element={<AdminSupplierWaste />} />
          <Route path="sustainability" element={<SustainabilityDashboard />} />
          <Route path="*" element={<div style={{padding: '2rem'}}>Admin Page under construction...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
