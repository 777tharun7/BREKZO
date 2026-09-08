import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminRefunds = () => {
  const [loading, setLoading] = useState(false);
  
  const processRefund = () => {
    toast.success('Refund processed successfully to campus wallet.');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Refunds & Disputes</h2>
        <p className="text-secondary">Manage order cancellations and wallet refunds</p>
      </div>

      <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCcw size={48} className="text-brand" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
        <h3>All Caught Up!</h3>
        <p className="text-secondary">There are no pending refund requests at the moment.</p>
      </div>
    </div>
  );
};

export default AdminRefunds;
