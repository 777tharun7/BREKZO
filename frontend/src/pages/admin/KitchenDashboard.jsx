import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import { QrCode, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const KitchenDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickupCode, setPickupCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const canteenId = 1; // Hardcoded to single canteen for now

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${API_URL}/api/orders/canteen/${canteenId}/active`);
        setOrders(res.data);
      } catch (error) {
        toast.error('Failed to load kitchen orders');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();

    // Setup WebSocket
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const socket = io(API_URL);
    
    socket.on('connect', () => {
      socket.emit('join_kitchen', { canteen_id: canteenId });
    });

    socket.on('kitchen_order_updated', (data) => {
      setOrders(prev => {
        const exists = prev.find(o => o.id === data.order_id);
        if (exists) {
          return prev.map(o => o.id === data.order_id ? { ...o, status: data.status } : o);
        } else if (data.order) {
          return [...prev, data.order];
        }
        return prev;
      });
    });

    return () => socket.disconnect();
  }, [canteenId]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Optimitic update
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
      
      await axios.patch(`${API_URL}/api/orders/${orderId}/status`, { status: newStatus });
      
      // Also emit via websocket so tracking updates instantly
      const socket = io(API_URL);
      const order = orders.find(o => o.id === orderId);
      socket.emit('update_order_status', { 
        order_id: orderId, 
        status: newStatus, 
        canteen_id: canteenId,
        user_id: order?.user_id 
      });
      
      if (newStatus === 'completed') {
        setTimeout(() => {
          setOrders(prev => prev.filter(o => o.id !== orderId));
        }, 1000); // Remove after a second for smooth transition
      }
    } catch (error) {
      toast.error('Failed to update status');
      // Revert on error
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/orders/canteen/${canteenId}/active`);
      setOrders(res.data);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!pickupCode || pickupCode.length !== 6) {
      return toast.error("Please enter a valid 6-digit code");
    }
    setVerifying(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.post(`${API_URL}/api/pickup/verify`, {
        canteen_id: canteenId,
        pickup_code: pickupCode
      });
      toast.success(res.data.message);
      setPickupCode('');
      
      // Update local state and emit to tracker
      const orderId = res.data.order_id;
      setOrders(prev => prev.filter(o => o.id !== orderId));
      
      const socket = io(API_URL);
      const order = orders.find(o => o.id === orderId);
      socket.emit('update_order_status', { 
        order_id: orderId, 
        status: 'completed', 
        canteen_id: canteenId,
        user_id: order?.user_id
      });
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to verify code');
    } finally {
      setVerifying(false);
    }
  };

  const verifyScannedCode = async (code, orderId) => {
    setVerifying(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.post(`${API_URL}/api/pickup/verify`, {
        canteen_id: canteenId,
        pickup_code: code
      });
      toast.success('QR Code verified successfully!');
      
      setOrders(prev => prev.filter(o => o.id !== orderId));
      
      const socket = io(API_URL);
      const order = orders.find(o => o.id === orderId);
      socket.emit('update_order_status', { 
        order_id: orderId, 
        status: 'completed', 
        canteen_id: canteenId,
        user_id: order?.user_id
      });
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid QR Code');
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!showScanner) return;
    const scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: 250 }, false);
    
    scanner.render((decodedText) => {
      try {
        const data = JSON.parse(decodedText);
        if (data.code && data.order_id) {
          scanner.clear();
          setShowScanner(false);
          verifyScannedCode(data.code, data.order_id);
        }
      } catch(e) {
        // Not our QR code format
      }
    }, () => {});

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [showScanner]);

  const columns = [
    { id: 'pending', title: 'New Orders', color: 'var(--brand-secondary)' },
    { id: 'accepted', title: 'Accepted', color: 'var(--brand-tertiary, #9b59b6)' },
    { id: 'preparing', title: 'Cooking', color: 'var(--brand-primary)' },
    { id: 'ready', title: 'Ready for Pickup', color: 'var(--status-success)' }
  ];

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Loading kitchen display...</div>;

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0 }}>Kitchen Display System (KDS)</h2>
          <p className="text-secondary" style={{ margin: 0 }}>Live order tracking for Spice Garden</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Enter 6-digit Code" 
              value={pickupCode}
              onChange={e => setPickupCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ width: '150px' }}
            />
            <button type="submit" className="btn btn-primary" disabled={verifying || pickupCode.length !== 6}>
              Verify
            </button>
          </form>
          <button className="btn btn-secondary" onClick={() => setShowScanner(true)}>
            <QrCode size={18} /> Scan QR
          </button>
        </div>

        <div className="badge badge-brand">
          {orders.filter(o => o.status !== 'completed').length} Active Orders
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
        {columns.map(col => {
          const colOrders = orders.filter(o => o.status === col.id);
          
          return (
            <div key={col.id} style={{ 
              flex: 1, minWidth: '320px', 
              backgroundColor: 'var(--bg-input)', 
              borderRadius: '0.75rem',
              display: 'flex', flexDirection: 'column'
            }}>
              <div style={{ 
                padding: '1rem', 
                borderBottom: '2px solid var(--border-color)',
                borderTop: `4px solid ${col.color}`,
                borderTopLeftRadius: '0.75rem', borderTopRightRadius: '0.75rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h3 style={{ margin: 0, fontSize: '1.125rem' }}>{col.title}</h3>
                <span style={{ 
                  backgroundColor: 'var(--bg-card)', padding: '0.25rem 0.75rem', 
                  borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600 
                }}>
                  {colOrders.length}
                </span>
              </div>
              
              <div style={{ padding: '1rem', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {colOrders.map(order => (
                  <div key={order.id} className="card animate-slide-up" style={{ padding: '1rem' }}>
                    <div className="flex-between" style={{ marginBottom: '0.75rem', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.75rem' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>#{order.id}</div>
                        <div className="text-secondary" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                          {order.user_name || 'Guest'} • {order.user_phone || 'No phone'}
                        </div>
                      </div>
                      <div className="text-secondary" style={{ fontSize: '0.875rem' }}>
                        {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      {order.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>
                          <span style={{ color: 'var(--brand-primary)' }}>{item.quantity}x</span>
                          <span>{item.name}</span>
                        </div>
                      ))}
                    </div>
                    
                    {order.notes && (
                      <div style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', color: 'var(--status-warning)', padding: '0.5rem', borderRadius: '0.25rem', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        <strong>Note:</strong> {order.notes}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {col.id === 'pending' && (
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => updateStatus(order.id, 'accepted')}>
                          Accept Order
                        </button>
                      )}
                      {col.id === 'accepted' && (
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => updateStatus(order.id, 'preparing')}>
                          Start Cooking
                        </button>
                      )}
                      {col.id === 'preparing' && (
                        <button className="btn btn-primary btn-sm" style={{ flex: 1, backgroundColor: 'var(--status-success)' }} onClick={() => updateStatus(order.id, 'ready')}>
                          Mark Ready
                        </button>
                      )}
                      {col.id === 'ready' && (
                        <div className="text-center text-success" style={{ width: '100%', fontWeight: 'bold' }}>
                          Awaiting pickup code...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {/* QR Scanner Modal */}
      {showScanner && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', 
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <QrCode size={24} className="text-brand" /> Scan Pickup QR
              </h3>
              <button 
                onClick={() => setShowScanner(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div id="qr-reader" style={{ width: '100%' }}></div>
              <p className="text-center text-secondary" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
                Point the camera at the student's Order Tracker QR Code to verify their pickup instantly.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KitchenDashboard;
