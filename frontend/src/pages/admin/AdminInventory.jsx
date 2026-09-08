import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Package, AlertTriangle, Plus } from 'lucide-react';

import { motion } from 'framer-motion';

const AdminInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const canteenId = 1;

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.get(`${API_URL}/api/inventory/${canteenId}`);
      setInventory(res.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleRestock = async (id) => {
    const amount = prompt("Enter amount to restock:");
    if (!amount || isNaN(amount)) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${API_URL}/api/inventory/${canteenId}/restock`, {
        ingredient_id: id,
        amount: parseFloat(amount)
      });
      toast.success("Restocked successfully!");
      fetchInventory();
    } catch (error) {
      toast.error("Failed to restock");
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Loading inventory...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2><Package className="text-brand" style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} /> Inventory Manager</h2>
          <p className="text-secondary" style={{ margin: 0 }}>Track raw materials and auto-deduct from recipes</p>
        </div>
      </div>

      <motion.div 
        className="grid-cards"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        {inventory.map(item => {
          const isLow = item.current_stock <= item.min_stock_alert;
          return (
            <motion.div 
              key={item.id} 
              className="card" 
              style={{ padding: '1.5rem' }}
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
              }}
              whileHover={{ y: -5 }}
            >
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{item.name}</h3>
                {isLow && <span className="badge badge-nonveg" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={12} /> Low Stock</span>}
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Current Stock</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: isLow ? 'var(--status-error)' : 'var(--text-primary)' }}>
                  {item.current_stock.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{item.unit}</span>
                </div>
              </div>

              <motion.button 
                whileTap={{ scale: 0.95 }}
                className="btn btn-outline" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }} 
                onClick={() => handleRestock(item.id)}
              >
                <Plus size={16} /> Restock
              </motion.button>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default AdminInventory;
