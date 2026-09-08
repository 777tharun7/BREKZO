import { useState } from 'react';
import { Globe, Lightbulb, TrendingDown } from 'lucide-react';

const SustainabilityDashboard = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Sustainability Dashboard</h2>
        <p className="text-secondary">Campus-wide AI insights on food waste</p>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, rgba(46, 204, 113, 0.1), rgba(39, 174, 96, 0.05))', border: '1px solid rgba(46, 204, 113, 0.2)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--status-success)' }}>
          <Lightbulb size={24} /> AI Recommendation Engine
        </h3>
        <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <li><strong>Reduce Production:</strong> Historical data suggests Samosa demand drops by 30% on rainy Tuesdays. Reduce batch size by 15 portions today.</li>
          <li><strong>Smart Discount Trigger:</strong> You have 20 portions of Pasta near closing. Recommend triggering a 40% OFF push notification to students to clear stock and prevent waste.</li>
          <li><strong>Menu Optimization:</strong> Replace plastic containers for salads with biodegradable ones to improve Campus Green Score by 5 points.</li>
        </ul>
      </div>

      <div className="grid-cards">
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="text-secondary" style={{ marginBottom: '0.5rem' }}>Monthly Carbon Footprint Saved</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--status-success)' }}>124 kg CO₂</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-success)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            <TrendingDown size={16} /> 12% from last month
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.5rem' }}>
          <div className="text-secondary" style={{ marginBottom: '0.5rem' }}>Financial Loss Prevented</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--brand-primary)' }}>₹14,500</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Via Smart Discounts & Batching
          </div>
        </div>
      </div>
    </div>
  );
};

export default SustainabilityDashboard;
