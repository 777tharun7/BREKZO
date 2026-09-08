import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Star, MapPin } from 'lucide-react';
import axios from 'axios';

const MultiCanteen = () => {
  const [canteens, setCanteens] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCanteens = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await axios.get(`${API_URL}/api/canteens/`);
        setCanteens(res.data);
      } catch (error) {
        console.error('Failed to fetch canteens', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCanteens();
  }, []);

  if (loading) {
    return (
      <div className="grid-cards">
        {[1, 2, 3].map(i => (
          <div key={i} className="card skeleton" style={{ height: '300px' }}></div>
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Where do you want to eat?</h2>
        <p className="text-secondary">Select a canteen to explore the menu</p>
      </div>

      <div className="grid-cards">
        {canteens.map(canteen => (
          <div 
            key={canteen.id} 
            className="card" 
            style={{ 
              cursor: canteen.is_open ? 'pointer' : 'not-allowed',
              opacity: canteen.is_open ? 1 : 0.7
            }}
            onClick={() => {
              if (canteen.is_open) {
                navigate(`/user/canteen/${canteen.id}/menu`);
              }
            }}
          >
            <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
              <img 
                src={canteen.image_url || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80'} 
                alt={canteen.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80';
                }}
              />
              <div style={{ 
                position: 'absolute', top: '1rem', right: '1rem', 
                backgroundColor: canteen.is_open ? 'var(--status-success)' : 'var(--status-error)',
                color: 'white', padding: '0.25rem 0.75rem', borderRadius: '999px',
                fontSize: '0.75rem', fontWeight: 'bold'
              }}>
                {canteen.is_open ? 'OPEN' : 'CLOSED'}
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>{canteen.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--brand-secondary)' }}>
                  <Star size={16} fill="currentColor" />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{canteen.rating}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                <MapPin size={16} />
                <span>{canteen.location}</span>
              </div>
              
              {canteen.is_open && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-warning)', fontSize: '0.875rem', fontWeight: 500, backgroundColor: 'rgba(241, 196, 15, 0.1)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                  <Clock size={16} />
                  <span>Est. Wait: {canteen.wait_time_minutes} mins</span>
                </div>
              )}

              {canteen.top_items && canteen.top_items.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <p className="text-secondary" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Top Picks</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {canteen.top_items.map((item, idx) => (
                      <span key={idx} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', backgroundColor: 'var(--bg-input)', borderRadius: '4px' }}>
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MultiCanteen;
