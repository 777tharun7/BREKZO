import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { ShoppingBag, Star, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/Pagination';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';

const UserActivity = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'reviews'
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { addToCart } = useCart();
  
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const offset = (currentPage - 1) * itemsPerPage;
        const res = await axios.get(`${API_URL}/api/orders/user/${user.id}?limit=${itemsPerPage}&offset=${offset}`);
        setOrders(res.data.orders);
        setTotalOrders(res.data.total);
      } catch (error) {
        console.error('Failed to fetch orders', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [user, currentPage, activeTab]);

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'var(--status-success)';
      case 'pending': return 'var(--text-secondary)';
      case 'cancelled': return 'var(--status-error)';
      default: return 'var(--status-warning)';
    }
  };

  const handleReorder = (order) => {
    order.items.forEach(item => {
      addToCart(item, item.customizations || {});
    });
    toast.success('Items added to cart!');
    navigate(`/user/canteen/${order.canteen_id}/menu`);
  };

  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleOpenFeedback = (order) => {
    setActiveOrder(order);
    setRating(5);
    setComment('');
    setIsFeedbackOpen(true);
  };

  const submitFeedback = async () => {
    setSubmittingReview(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${API_URL}/api/reviews/`, {
        user_id: user.id,
        order_id: activeOrder.id,
        rating,
        comment
      });
      toast.success('Feedback submitted successfully!');
      setIsFeedbackOpen(false);
      setActiveOrder(null);
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2>My Activity</h2>
        <p className="text-secondary">Track your orders and past reviews</p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`btn ${activeTab === 'orders' ? 'text-brand' : 'text-secondary'}`}
          style={{ 
            borderRadius: 0, 
            borderBottom: activeTab === 'orders' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            paddingBottom: '0.75rem',
            paddingLeft: 0, paddingRight: 0, marginRight: '1rem'
          }}
          onClick={() => { setActiveTab('orders'); setCurrentPage(1); }}
        >
          <ShoppingBag size={18} style={{ marginRight: '0.5rem' }} /> Order History
        </button>
        <button 
          className={`btn ${activeTab === 'reviews' ? 'text-brand' : 'text-secondary'}`}
          style={{ 
            borderRadius: 0, 
            borderBottom: activeTab === 'reviews' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            paddingBottom: '0.75rem',
            paddingLeft: 0, paddingRight: 0
          }}
          onClick={() => setActiveTab('reviews')}
        >
          <Star size={18} style={{ marginRight: '0.5rem' }} /> My Reviews
        </button>
      </div>

      {activeTab === 'orders' && (
        <div>
          {loading ? (
            <div className="flex-center" style={{ height: '200px' }}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No orders found. Time to grab a bite!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {orders.map(order => (
                <div key={order.id} className="card" style={{ padding: '1.5rem' }}>
                  <div className="flex-between" style={{ marginBottom: '1rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Order #{order.id}</div>
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {new Date(order.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="badge" style={{ 
                      backgroundColor: 'var(--bg-input)', 
                      color: getStatusColor(order.status),
                      borderColor: getStatusColor(order.status)
                    }}>
                      {order.status}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex-between" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                        <span>{item.quantity}x {item.name}</span>
                        <span className="text-secondary">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex-between" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>Total: ₹{order.total}</div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {order.status !== 'completed' && order.status !== 'cancelled' ? (
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/user/orders/${order.id}`)}
                        >
                          Track Order
                        </button>
                      ) : order.status === 'completed' && (
                        <>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenFeedback(order)}
                          >
                            Leave Feedback
                          </button>
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReorder(order)}
                          >
                            Reorder
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              <Pagination 
                totalItems={totalOrders}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <MessageSquare size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
          <div>Review system coming soon!</div>
        </div>
      )}

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setIsFeedbackOpen(false)}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>Rate Order #{activeOrder?.id}</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: star <= rating ? 'var(--status-warning)' : 'var(--text-muted)' }}
                  onClick={() => setRating(star)}
                >
                  <Star size={32} fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>

            <textarea
              className="input-field"
              placeholder="What did you like or dislike?"
              rows="4"
              value={comment}
              onChange={e => setComment(e.target.value)}
              style={{ width: '100%', marginBottom: '1.5rem', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsFeedbackOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={submitFeedback} disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserActivity;
