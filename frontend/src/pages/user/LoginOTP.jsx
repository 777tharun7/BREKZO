import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import Loader from '../../components/shared/Loader';

const LoginOTP = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message);
        toast(data.hint, { icon: '💡' });
        setStep(2);
      } else {
        toast.error(data.detail || 'Failed to send OTP');
      }
    } catch (error) {
      toast.error('Network error. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 4) {
      toast.error('OTP must be 4 digits');
      return;
    }
    
    setLoading(true);
    try {
      const user = await login(phone, otp, name);
      if (user) {
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      }
    } catch (error) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  // Auto-submit OTP when 4 digits are reached
  useEffect(() => {
    if (otp.length === 4 && !loading) {
      handleVerifyOTP();
    }
  }, [otp]);

  return (
    <div className="flex-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '1rem' }}>
      <div className="card glass-panel animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 className="text-brand">Breakzo</h1>
          <p className="text-secondary">Campus Food, Simplified.</p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendOTP}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Phone Number</label>
              <input
                type="tel"
                className="input-field"
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading || phone.length < 10 || !name.trim()}
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="input-group">
              <label className="input-label">Enter OTP</label>
              <input
                type="text"
                className="input-field"
                placeholder="4-digit code (Hint: 1234)"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                required
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading || otp.length < 4}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <button 
              type="button" 
              className="btn" 
              style={{ width: '100%', marginTop: '0.5rem', color: 'var(--text-muted)' }}
              onClick={() => setStep(1)}
              disabled={loading}
            >
              Back to Phone
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginOTP;
