import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Ticket, Plus, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/Pagination';

const AdminOffersManager = () => {
  const [activeTab, setActiveTab] = useState('combos'); // 'combos' or 'coupons'
  const [offers, setOffers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discount_percent: '', min_order_amount: 0, max_uses: 100 });
  const [newOffer, setNewOffer] = useState({ title: '', description: '', discount_percent: '', min_order_amount: 0 });
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        if (activeTab === 'combos') {
          const res = await axios.get(`${API_URL}/api/offers/?admin=true`);
          setOffers(res.data);
        } else {
          const res = await axios.get(`${API_URL}/api/offers/coupons?admin=true`);
          setCoupons(res.data);
        }
        setCurrentPage(1);
      } catch (error) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = activeTab === 'combos' 
    ? offers.slice(indexOfFirstItem, indexOfLastItem)
    : coupons.slice(indexOfFirstItem, indexOfLastItem);

  const handleToggleCoupon = async (id) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.patch(`${API_URL}/api/offers/coupons/${id}/toggle`);
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, is_active: c.is_active ? 0 : 1 } : c));
      toast.success('Coupon status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleToggleOffer = async (id) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.patch(`${API_URL}/api/offers/${id}/toggle`);
      setOffers(prev => prev.map(o => o.id === id ? { ...o, is_active: o.is_active ? 0 : 1 } : o));
      toast.success('Offer status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${API_URL}/api/offers/coupons`, {
        code: newCoupon.code,
        discount_percent: newCoupon.discount_percent ? parseFloat(newCoupon.discount_percent) : null,
        min_order_amount: parseFloat(newCoupon.min_order_amount),
        max_uses: parseInt(newCoupon.max_uses)
      });
      toast.success('Coupon created successfully');
      setShowModal(false);
      setNewCoupon({ code: '', discount_percent: '', min_order_amount: 0, max_uses: 100 });
      // Refresh list
      const res = await axios.get(`${API_URL}/api/offers/coupons?admin=true`);
      setCoupons(res.data);
    } catch (error) {
      toast.error('Failed to create coupon');
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${API_URL}/api/offers`, {
        title: newOffer.title,
        description: newOffer.description,
        discount_percent: newOffer.discount_percent ? parseFloat(newOffer.discount_percent) : null,
        min_order_amount: parseFloat(newOffer.min_order_amount)
      });
      toast.success('Offer created successfully');
      setShowModal(false);
      setNewOffer({ title: '', description: '', discount_percent: '', min_order_amount: 0 });
      const res = await axios.get(`${API_URL}/api/offers/?admin=true`);
      setOffers(res.data);
    } catch (error) {
      toast.error('Failed to create offer');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2>Offers & Promos Manager</h2>
          <p className="text-secondary">Create combos and promo codes for students</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} /> Create New
        </button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`btn ${activeTab === 'combos' ? 'text-brand' : 'text-secondary'}`}
          style={{ 
            borderRadius: 0, 
            borderBottom: activeTab === 'combos' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            paddingBottom: '0.75rem',
            paddingLeft: 0, paddingRight: 0, marginRight: '1rem'
          }}
          onClick={() => setActiveTab('combos')}
        >
          <Tag size={18} style={{ marginRight: '0.5rem' }} /> Festival Combos
        </button>
        <button 
          className={`btn ${activeTab === 'coupons' ? 'text-brand' : 'text-secondary'}`}
          style={{ 
            borderRadius: 0, 
            borderBottom: activeTab === 'coupons' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            paddingBottom: '0.75rem',
            paddingLeft: 0, paddingRight: 0
          }}
          onClick={() => setActiveTab('coupons')}
        >
          <Ticket size={18} style={{ marginRight: '0.5rem' }} /> Promo Codes
        </button>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '40vh' }}>Loading...</div>
      ) : activeTab === 'combos' ? (
        <>
          <div className="grid-cards">
            {currentItems.map(offer => (
              <div key={offer.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="flex-between" style={{ marginBottom: '1rem' }}>
                  <span className="badge badge-brand">{offer.offer_type}</span>
                  <div className="text-success" style={{ fontWeight: 'bold' }}>
                    {offer.discount_percent ? `${offer.discount_percent}% OFF` : `₹${offer.discount_amount} OFF`}
                  </div>
                </div>
                <h3 style={{ margin: '0 0 0.5rem 0' }}>{offer.title}</h3>
                <p className="text-secondary" style={{ flex: 1 }}>{offer.description}</p>
                <div className="flex-between" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <div className="text-muted">Valid till: {new Date(offer.valid_until).toLocaleDateString()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ color: offer.is_active ? 'var(--status-success)' : 'var(--status-error)', fontWeight: 600 }}>
                      {offer.is_active ? 'Active' : 'Expired'}
                    </div>
                    <button className={`btn btn-sm ${offer.is_active ? 'btn-danger' : 'btn-primary'}`} onClick={() => handleToggleOffer(offer.id)}>
                      {offer.is_active ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Pagination 
            totalItems={offers.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                  <tr>
                    <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Code</th>
                    <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Discount</th>
                    <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Min Order</th>
                    <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Uses</th>
                    <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map(coupon => (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                        <span style={{ backgroundColor: 'rgba(255, 107, 53, 0.1)', color: 'var(--brand-primary)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                          {coupon.code}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--status-success)' }}>
                        {coupon.discount_percent ? `${coupon.discount_percent}%` : `₹${coupon.discount_amount}`}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>₹{coupon.min_order_amount}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>{coupon.used_count} / {coupon.max_uses}</td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <button 
                          className={`btn btn-sm ${coupon.is_active ? 'btn-danger' : 'btn-primary'}`}
                          onClick={() => handleToggleCoupon(coupon.id)}
                        >
                          {coupon.is_active ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination 
            totalItems={coupons.length}
            itemsPerPage={itemsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* Create Coupon Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Create New {activeTab === 'combos' ? 'Offer' : 'Promo Code'}</h3>
            
            {activeTab === 'coupons' ? (
              <form onSubmit={handleCreateCoupon}>
                <div className="input-group">
                  <label className="input-label">Code Name (e.g. SUMMER20)</label>
                  <input required type="text" className="input-field" value={newCoupon.code} onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Discount Percentage (%)</label>
                  <input required type="number" className="input-field" value={newCoupon.discount_percent} onChange={e => setNewCoupon({...newCoupon, discount_percent: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Minimum Order Amount (₹)</label>
                  <input required type="number" className="input-field" value={newCoupon.min_order_amount} onChange={e => setNewCoupon({...newCoupon, min_order_amount: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Max Total Uses</label>
                  <input required type="number" className="input-field" value={newCoupon.max_uses} onChange={e => setNewCoupon({...newCoupon, max_uses: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Coupon</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateOffer}>
                <div className="input-group">
                  <label className="input-label">Offer Title</label>
                  <input required type="text" className="input-field" value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Description</label>
                  <textarea required className="input-field" rows="2" value={newOffer.description} onChange={e => setNewOffer({...newOffer, description: e.target.value})}></textarea>
                </div>
                <div className="input-group">
                  <label className="input-label">Discount Percentage (%)</label>
                  <input type="number" className="input-field" value={newOffer.discount_percent} onChange={e => setNewOffer({...newOffer, discount_percent: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Minimum Order Amount (₹)</label>
                  <input required type="number" className="input-field" value={newOffer.min_order_amount} onChange={e => setNewOffer({...newOffer, min_order_amount: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create Offer</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOffersManager;
