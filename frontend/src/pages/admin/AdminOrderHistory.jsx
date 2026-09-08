import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/Pagination';

const AdminOrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const itemsPerPage = 10;
  const canteenId = 1; // Default canteen

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const offset = (currentPage - 1) * itemsPerPage;
        const res = await axios.get(`${API_URL}/api/orders/canteen/${canteenId}/all?limit=${itemsPerPage}&offset=${offset}`);
        setOrders(res.data.orders);
        setTotalOrders(res.data.total);
      } catch (error) {
        toast.error('Failed to load order history');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [currentPage]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'var(--status-success)';
      case 'pending': return 'var(--text-secondary)';
      case 'cancelled': return 'var(--status-error)';
      default: return 'var(--status-warning)';
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Order History</h2>
        <p className="text-secondary">View all past and current orders</p>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="flex-center" style={{ height: '200px' }}>Loading...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            No orders found.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>Order ID</th>
                <th style={{ padding: '1rem' }}>Customer</th>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Total</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>#{order.id}</td>
                  <td style={{ padding: '1rem' }}>{order.user_name || 'Guest'}</td>
                  <td style={{ padding: '1rem' }}>{new Date(order.created_at).toLocaleString()}</td>
                  <td style={{ padding: '1rem', fontWeight: 'bold' }}>₹{order.total}</td>
                  <td style={{ padding: '1rem' }}>
                    <span className="badge" style={{ backgroundColor: 'var(--bg-input)', color: getStatusColor(order.status), borderColor: getStatusColor(order.status) }}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && totalOrders > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <Pagination 
            totalItems={totalOrders}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
};

export default AdminOrderHistory;
