import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, Award, Flame, ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/Pagination';

const WalletAndLoyalty = () => {
  const { user, updateWallet } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [totalTxs, setTotalTxs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('');
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const itemsPerPage = 8;

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const offset = (currentPage - 1) * itemsPerPage;
      const res = await axios.get(`${API_URL}/api/wallet/${user.id}/transactions?limit=${itemsPerPage}&offset=${offset}`);
      setTransactions(res.data.transactions);
      setTotalTxs(res.data.total);
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, currentPage]);

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupAmount || isNaN(topupAmount) || Number(topupAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setProcessing(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.post(`${API_URL}/api/wallet/topup`, {
        user_id: user.id,
        amount: Number(topupAmount),
        payment_method: 'UPI'
      });
      
      if (res.data.success) {
        toast.success(`₹${topupAmount} added to wallet!`);
        updateWallet(res.data.new_balance);
        setIsTopupModalOpen(false);
        setTopupAmount('');
        setCurrentPage(1);
        fetchTransactions();
      }
    } catch (error) {
      toast.error('Failed to process top-up');
    } finally {
      setProcessing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Wallet & Loyalty</h2>
        <p className="text-secondary">Manage your campus funds and rewards</p>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        {/* Wallet Balance Card */}
        <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--bg-card), var(--bg-input))' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <CreditCard size={20} />
              <span style={{ fontWeight: 500 }}>Available Balance</span>
            </div>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, color: 'var(--brand-primary)', marginBottom: '1.5rem', lineHeight: 1 }}>
            ₹{user.wallet_balance?.toFixed(2) || '0.00'}
          </div>
          <button 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            onClick={() => setIsTopupModalOpen(true)}
          >
            Add Funds
          </button>
        </div>

        {/* Loyalty Points Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Award size={20} />
              <span style={{ fontWeight: 500 }}>Campus Points</span>
            </div>
            <span className="badge badge-brand">Gold Tier</span>
          </div>
          <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1 }}>
            {user.loyalty_points || 0}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Flame size={20} className="text-brand" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Current Streak</div>
                <div style={{ fontWeight: 600 }}>{user.current_streak || 0} Days</div>
              </div>
            </div>
            <div style={{ flex: 1, backgroundColor: 'var(--bg-input)', padding: '0.75rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} className="text-warning" />
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Highest Streak</div>
                <div style={{ fontWeight: 600 }}>{user.highest_streak || 0} Days</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={20} /> Transaction History
        </h3>
        
        {loading && transactions.length === 0 ? (
          <div className="flex-center" style={{ height: '100px' }}>Loading...</div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No transactions yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {transactions.map(tx => (
              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    backgroundColor: tx.type === 'credit' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: tx.type === 'credit' ? 'var(--status-success)' : 'var(--status-error)'
                  }}>
                    {tx.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500 }}>{tx.description}</div>
                    <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 600, color: tx.type === 'credit' ? 'var(--status-success)' : 'var(--text-primary)' }}>
                  {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        <Pagination 
          totalItems={totalTxs}
          itemsPerPage={itemsPerPage}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Top-up Modal */}
      {isTopupModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Add Funds to Wallet</h3>
            <form onSubmit={handleTopup}>
              <div className="input-group">
                <label className="input-label">Amount (₹)</label>
                <input
                  type="number"
                  className="input-field"
                  placeholder="Enter amount"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  min="1"
                  required
                />
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[100, 200, 500].map(amt => (
                  <button 
                    key={amt}
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setTopupAmount(amt.toString())}
                  >
                    +₹{amt}
                  </button>
                ))}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => setIsTopupModalOpen(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  disabled={processing || !topupAmount}
                >
                  {processing ? 'Processing...' : 'Pay via UPI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletAndLoyalty;
