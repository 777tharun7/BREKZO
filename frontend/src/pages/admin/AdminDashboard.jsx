import { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, ShoppingBag, Clock, TrendingUp, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ 
    total_orders: 0, 
    total_revenue: 0, 
    chart_data: [], 
    top_items: [] 
  });
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const [statsRes, canteensRes] = await Promise.all([
        axios.get(`${API_URL}/api/analytics/dashboard`),
        axios.get(`${API_URL}/api/canteens/`)
      ]);
      setStats(statsRes.data);
      setCanteens(canteensRes.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const toggleCanteenStatus = async (canteenId, currentStatus) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await axios.patch(`${API_URL}/api/canteens/${canteenId}/status`, {
        is_open: !currentStatus
      });
      toast.success('Canteen status updated');
      fetchDashboardData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Loading analytics...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Dashboard Overview</h2>
        <p className="text-secondary">Today's live statistics and controls</p>
      </div>

      {/* KPI Cards */}
      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(255, 107, 53, 0.1)', color: 'var(--brand-primary)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Total Revenue</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>₹{stats.total_revenue.toLocaleString()}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(52, 152, 219, 0.1)', color: 'var(--status-info)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Orders Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total_orders}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(241, 196, 15, 0.1)', color: 'var(--status-warning)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Avg. Prep Time</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>12 mins</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Revenue Chart */}
        <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <TrendingUp size={20} className="text-brand" /> Today's Revenue Trend
          </h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '0.5rem' }} 
                />
                <Line type="monotone" dataKey="revenue" stroke="var(--brand-primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Canteen Status Controls */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Store size={20} className="text-brand" /> Live Outlets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {canteens.map(canteen => (
              <div key={canteen.id} className="flex-between" style={{ padding: '1rem', backgroundColor: 'var(--bg-input)', borderRadius: '0.5rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{canteen.name}</div>
                  <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Est. wait: {canteen.wait_time_minutes} min</div>
                </div>
                
                <button 
                  className={`btn btn-sm ${canteen.is_open ? 'btn-danger' : 'btn-primary'}`}
                  onClick={() => toggleCanteenStatus(canteen.id, canteen.is_open)}
                >
                  {canteen.is_open ? 'Close Outlet' : 'Open Outlet'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Top Items List */}
        <div className="card" style={{ padding: '1.5rem', gridColumn: 'span 2' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <ShoppingBag size={20} className="text-brand" /> Top 5 Popular Items
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {stats.top_items && stats.top_items.map((item, idx) => (
              <div key={idx} className="flex-between" style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-input)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="text-secondary" style={{ fontSize: '0.875rem' }}>₹{item.price} • {item.total_orders} Total Orders</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
