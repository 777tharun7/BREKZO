import { useState, useEffect } from 'react';
import axios from 'axios';
import { Leaf, AlertTriangle, Scale } from 'lucide-react';

const AdminSupplierWaste = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Supplier & Waste Management</h2>
        <p className="text-secondary">Log end-of-day waste and monitor overproduction</p>
      </div>

      <div className="grid-cards" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(46, 204, 113, 0.1)', color: 'var(--status-success)' }}>
            <Leaf size={24} />
          </div>
          <div>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Sustainability Score</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>A-</div>
          </div>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', display: 'flex', gap: '1rem' }}>
          <div style={{ padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--status-error)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Total Waste Today</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>4.2 kg</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem' }}>Log Unsold Items</h3>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>
          Please select the item and quantity that was left over at closing time. 
          This helps the AI recommend better batch sizes for tomorrow.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 2, margin: 0 }}>
            <label className="input-label">Select Item</label>
            <select className="input-field">
              <option>Samosa</option>
              <option>Paneer Puff</option>
              <option>Idli</option>
            </select>
          </div>
          <div className="input-group" style={{ flex: 1, margin: 0 }}>
            <label className="input-label">Quantity</label>
            <input type="number" className="input-field" placeholder="0" />
          </div>
          <button className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Log Waste</button>
        </div>
      </div>
    </div>
  );
};

export default AdminSupplierWaste;
