import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for session
    const storedUser = localStorage.getItem('breakzo_user');
    const token = localStorage.getItem('breakzo_token');
    
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = async (phone, otp, name) => {
    try {
      // For development, point to local backend if not in prod
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await axios.post(`${API_URL}/api/auth/verify-otp`, { phone, otp, name });
      
      if (res.data.success) {
        setUser(res.data.user);
        localStorage.setItem('breakzo_user', JSON.stringify(res.data.user));
        localStorage.setItem('breakzo_token', res.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        toast.success('Logged in successfully!');
        return res.data.user;
      }
      return null;
    } catch (err) {
      console.error('Login error:', err);
      toast.error('Failed to verify OTP');
      throw err;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('breakzo_user');
    localStorage.removeItem('breakzo_token');
    delete axios.defaults.headers.common['Authorization'];
    toast.success('Logged out');
  };

  const updateWallet = (newBalance) => {
    if (user) {
      const updatedUser = { ...user, wallet_balance: newBalance };
      setUser(updatedUser);
      localStorage.setItem('breakzo_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateWallet }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
