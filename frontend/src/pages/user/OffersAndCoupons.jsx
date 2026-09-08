import { useState, useEffect } from 'react';
import axios from 'axios';
import { Tag, Copy, PartyPopper, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const OffersAndCoupons = () => {
  const [offers, setOffers] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        const [offersRes, couponsRes] = await Promise.all([
          axios.get(`${API_URL}/api/offers/`),
          axios.get(`${API_URL}/api/offers/coupons`)
        ]);
        
        setOffers(offersRes.data);
        setCoupons(couponsRes.data);
      } catch (error) {
        toast.error('Failed to load offers');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied!`);
    setTimeout(() => setCopiedCode(''), 3000);
  };

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Loading amazing deals...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Offers & Combos</h2>
        <p className="text-secondary">Save money on your favorite meals</p>
      </div>

      <div style={{ marginBottom: '3rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <PartyPopper size={20} className="text-brand" /> Festival Combos & Deals
        </h3>
        
        <div className="grid-cards">
          {offers.map(offer => (
            <div key={offer.id} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--brand-primary)' }}>
              <div style={{ marginBottom: '1rem' }}>
                <span className="badge badge-brand" style={{ marginBottom: '0.5rem' }}>
                  {offer.offer_type}
                </span>
                <h4 style={{ margin: '0.5rem 0' }}>{offer.title}</h4>
                <p className="text-secondary" style={{ fontSize: '0.875rem' }}>{offer.description}</p>
              </div>
              
              <div className="flex-between" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--status-success)' }}>
                  {offer.discount_percent ? `${offer.discount_percent}% OFF` : `₹${offer.discount_amount} OFF`}
                </div>
                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                  Valid till: {new Date(offer.valid_until).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Tag size={20} className="text-brand" /> Promo Codes
        </h3>
        
        <div className="grid-cards">
          {coupons.map(coupon => (
            <div key={coupon.id} className="card" style={{ display: 'flex', borderStyle: 'dashed', borderWidth: '2px', borderColor: 'var(--border-color)' }}>
              <div style={{ padding: '1.5rem', flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.125rem', marginBottom: '0.25rem' }}>
                  {coupon.discount_percent ? `${coupon.discount_percent}% OFF` : `₹${coupon.discount_amount} OFF`}
                </div>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  {coupon.description}
                </p>
                {coupon.min_order_amount > 0 && (
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                    Min order: ₹{coupon.min_order_amount}
                  </div>
                )}
              </div>
              
              <div style={{ 
                backgroundColor: 'var(--bg-input)', width: '120px', 
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                borderLeft: '1px dashed var(--border-color)', padding: '1rem'
              }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '0.5rem', letterSpacing: '1px' }}>
                  {coupon.code}
                </div>
                <button 
                  className={`btn btn-sm ${copiedCode === coupon.code ? 'btn-primary' : 'btn-outline'}`}
                  style={{ width: '100%', padding: '0.25rem' }}
                  onClick={() => handleCopyCode(coupon.code)}
                >
                  {copiedCode === coupon.code ? <CheckCircle size={16} /> : <Copy size={16} />}
                  {copiedCode === coupon.code ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OffersAndCoupons;
