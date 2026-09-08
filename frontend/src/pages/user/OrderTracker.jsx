import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { CheckCircle2, Clock, ChefHat, PackageCheck, ArrowLeft, QrCode } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

const OrderTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const submitFeedback = async () => {
    setSubmittingReview(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const userStr = localStorage.getItem('breakzo_user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (!user) return;
      
      await axios.post(`${API_URL}/api/reviews/`, {
        user_id: user.id,
        order_id: parseInt(id),
        rating,
        comment
      });
      toast.success('Feedback submitted successfully!');
      setIsFeedbackOpen(false);
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Status index mapping for progress bar
  const statusLevels = {
    'pending': 0,
    'accepted': 1,
    'preparing': 2,
    'ready': 3,
    'completed': 4,
    'cancelled': -1
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${API_URL}/api/orders/${id}`);
        setOrder(res.data);
      } catch (error) {
        toast.error('Failed to load order tracking');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrder();

    // Setup WebSocket connection
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const socket = io(API_URL);
    
    socket.on('connect', () => {
      socket.emit('join_order', { order_id: id });
    });

    socket.on('order_status_updated', (data) => {
      if (data.order_id === parseInt(id)) {
        setOrder(prev => ({ ...prev, status: data.status }));
        
        // Show toast notification based on status
        if (data.status === 'preparing') toast.success('Kitchen started preparing your order!');
        if (data.status === 'ready') toast.success('Your order is READY for pickup!', { duration: 5000, icon: '🎉' });
        if (data.status === 'completed') toast.success('Enjoy your meal!');
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Finding your order...</div>;
  if (!order) return <div className="flex-center" style={{ height: '60vh' }}>Order not found</div>;

  const currentLevel = statusLevels[order.status];
  const isCancelled = currentLevel === -1;

  const steps = [
    { label: 'Order Placed', icon: <Clock size={24} />, level: 0 },
    { label: 'Accepted', icon: <CheckCircle2 size={24} />, level: 1 },
    { label: 'Preparing', icon: <ChefHat size={24} />, level: 2 },
    { label: 'Ready', icon: <PackageCheck size={24} />, level: 3 }
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={() => navigate('/user/orders')}
        style={{ marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={16} /> Back to Orders
      </button>

      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Order #{order.id}</h2>
        <div className="text-secondary">
          {order.canteen_id === 1 ? 'Spice Garden' : order.canteen_id === 2 ? 'The Byte Cafe' : 'Green Bowl'}
        </div>
      </div>

      {isCancelled ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'rgba(231, 76, 60, 0.05)', borderColor: 'var(--status-error)' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(231, 76, 60, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--status-error)' }}>
            <span style={{ fontSize: '2.5rem' }}>❌</span>
          </div>
          <h3 className="text-error">Order Cancelled</h3>
          <p className="text-secondary" style={{ marginTop: '0.5rem' }}>This order has been cancelled and refunded.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
          {/* Progress Tracker UI */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '3rem', zIndex: 1 }}>
            {/* Connecting line */}
            <div style={{ 
              position: 'absolute', top: '24px', left: '10%', right: '10%', height: '4px', 
              backgroundColor: 'var(--border-color)', zIndex: -1, borderRadius: '2px' 
            }}>
              <div style={{ 
                height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: '2px',
                width: `${(Math.min(currentLevel, 3) / 3) * 100}%`,
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>

            {/* Steps */}
            {steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33%' }}>
                <div style={{ 
                  width: '48px', height: '48px', borderRadius: '50%', 
                  backgroundColor: currentLevel >= step.level ? 'var(--brand-primary)' : 'var(--bg-card)',
                  color: currentLevel >= step.level ? 'white' : 'var(--text-muted)',
                  border: currentLevel >= step.level ? 'none' : '2px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.75rem',
                  transition: 'all 0.3s ease',
                  boxShadow: currentLevel === step.level ? '0 0 0 4px rgba(255, 107, 53, 0.2)' : 'none'
                }}>
                  {step.icon}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', fontWeight: 600, textAlign: 'center',
                  color: currentLevel >= step.level ? 'var(--text-primary)' : 'var(--text-muted)'
                }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: 'var(--bg-input)', padding: '1.5rem', borderRadius: '0.75rem', textAlign: 'center' }}>
            {currentLevel === 0 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Waiting for Kitchen...</div>
                <div className="text-secondary">Your order has been received.</div>
              </>
            )}
            {currentLevel === 1 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--brand-tertiary)' }}>Order Accepted</div>
                <div className="text-secondary">Kitchen has accepted your order.</div>
              </>
            )}
            {currentLevel === 2 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--brand-primary)' }}>Kitchen is Preparing</div>
                <div className="text-secondary">Estimated ready time: {new Date(order.estimated_ready).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
              </>
            )}
            {currentLevel === 3 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: '0.25rem', color: 'var(--status-success)' }}>Ready for Pickup!</div>
                <div className="text-secondary" style={{ marginBottom: '1rem' }}>Please collect your order from the counter.</div>
                
                <div style={{ backgroundColor: 'white', border: '2px dashed var(--border-color)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', maxWidth: '300px', margin: '0 auto' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Show this QR Code at counter</div>
                  
                  <div style={{ padding: '0.5rem', background: 'white', borderRadius: '0.5rem' }}>
                    <QRCodeSVG 
                      value={JSON.stringify({ order_id: order.id, code: order.pickup_code })} 
                      size={150} 
                      level="H" 
                      includeMargin={true}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>OR USE CODE</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', letterSpacing: '4px', color: 'var(--text-primary)' }}>
                      {order.pickup_code}
                    </div>
                  </div>
                </div>
              </>
            )}
            {currentLevel === 4 && (
              <>
                <div style={{ fontWeight: 600, fontSize: '1.25rem', marginBottom: '0.25rem' }}>Order Completed</div>
                <div className="text-secondary" style={{ marginBottom: '1.5rem' }}>Hope you enjoyed your meal!</div>
                <button className="btn btn-primary" onClick={() => setIsFeedbackOpen(true)}>
                  Leave Feedback
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Order Details Summary */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          Order Summary
        </h3>
        <div style={{ marginBottom: '1.5rem' }}>
          {order.items.map((item, idx) => (
            <div key={idx} className="flex-between" style={{ marginBottom: '0.75rem', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontWeight: 500 }}>{item.quantity}x</span> {item.name}
                {(item.customizations?.size || (item.customizations?.addons && item.customizations.addons.length > 0)) && (
                  <div className="text-secondary" style={{ fontSize: '0.75rem', marginLeft: '1.5rem' }}>
                    {item.customizations.size && `Size: ${item.customizations.size}`}
                    {item.customizations.addons && item.customizations.addons.length > 0 && ` | Add-ons: ${item.customizations.addons.join(', ')}`}
                  </div>
                )}
              </div>
              <div className="text-secondary">₹{item.price * item.quantity}</div>
            </div>
          ))}
        </div>
        
        <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1rem' }}>
          <div className="flex-between" style={{ marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex-between" style={{ marginBottom: '0.5rem', color: 'var(--status-success)' }}>
              <span>Discount</span>
              <span>-₹{order.discount}</span>
            </div>
          )}
          <div className="flex-between" style={{ fontWeight: 'bold', fontSize: '1.125rem', marginTop: '0.5rem' }}>
            <span>Total</span>
            <span className="text-brand">₹{order.total}</span>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {isFeedbackOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setIsFeedbackOpen(false)}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '1.5rem' }}>Rate Order #{order?.id}</h3>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: star <= rating ? 'var(--status-warning)' : 'var(--text-muted)' }}
                  onClick={() => setRating(star)}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill={star <= rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
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

export default OrderTracker;
