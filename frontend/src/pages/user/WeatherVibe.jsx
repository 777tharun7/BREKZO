import { useState, useEffect } from 'react';
import axios from 'axios';
import { CloudRain, Sun, Cloud, Thermometer, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const WeatherVibe = () => {
  const { user } = useAuth();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [vibeMessage, setVibeMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAIRecommendations = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${API_URL}/api/ai/recommendations/${user?.id || 1}`);
        setRecommendations(res.data.recommendations);
        setVibeMessage(res.data.vibe);
      } catch (error) {
        console.error("AI fetch error", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAIRecommendations();

    // Simulate weather based on time
    const hour = new Date().getHours();
    setWeather({
      temp: hour > 18 ? 18 : 28,
      condition: hour > 18 ? 'Cool Evening' : 'Sunny Day',
      location: 'Campus Central',
      icon: hour > 18 ? <Cloud size={48} className="text-brand" /> : <Sun size={48} className="text-brand" />
    });
  }, [user]);

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Analyzing weather vibes...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="card glass-panel" style={{ 
        padding: '3rem 2rem', 
        marginBottom: '2rem',
        background: 'linear-gradient(135deg, rgba(31, 41, 55, 0.8), rgba(17, 24, 39, 0.9))',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="flex-center" style={{ marginBottom: '1rem' }}>
          {weather?.icon}
        </div>
        <h2 style={{ fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: 'white' }}>{weather?.temp}°C</h2>
        <div style={{ fontSize: '1.25rem', opacity: 0.9, marginBottom: '0.25rem' }}>{weather?.condition}</div>
        <div style={{ opacity: 0.7, fontSize: '0.875rem' }}>{weather?.location}</div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={20} className="text-brand" /> Smart Recommendations
        </h3>
        <p className="text-secondary" style={{ fontStyle: 'italic' }}>{vibeMessage || "AI-curated picks based on current temperature and mood"}</p>
      </div>

      <div className="grid-cards">
        {recommendations.map(item => (
          <div key={item.item_id} className="card" style={{ display: 'flex', padding: '1rem', gap: '1rem', alignItems: 'center' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '1rem', 
              overflow: 'hidden', flexShrink: 0
            }}>
              <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.25rem 0' }}>{item.name}</h4>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
                "{item.reason}"
              </div>
              <div className="flex-between">
                <span style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>₹{item.price}</span>
                <button 
                  className="btn btn-sm btn-outline"
                  onClick={() => navigate(`/user/canteen/1/menu`)}
                >
                  Order
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeatherVibe;
