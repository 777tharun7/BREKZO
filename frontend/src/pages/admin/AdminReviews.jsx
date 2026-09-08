import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await axios.get(`${API_URL}/api/reviews/`);
        setReviews(res.data);
      } catch (error) {
        toast.error('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Student Reviews</h2>
        <p className="text-secondary">Monitor feedback and ratings for your items</p>
      </div>

      {loading ? (
        <div className="flex-center" style={{ height: '60vh' }}>Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No reviews found yet.
        </div>
      ) : (
        <div className="grid-cards">
          {reviews.map(review => (
            <div key={review.id} className="card animate-slide-up" style={{ padding: '1.5rem' }}>
              <div className="flex-between" style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600 }}>{review.item_name}</div>
                <div style={{ display: 'flex', color: 'var(--status-warning)' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} size={16} fill={star <= review.rating ? 'currentColor' : 'none'} color={star <= review.rating ? 'currentColor' : 'var(--border-color)'} />
                  ))}
                </div>
              </div>
              <p className="text-secondary" style={{ fontSize: '0.875rem', fontStyle: 'italic', marginBottom: '1rem' }}>
                "{review.comment || 'No comment provided.'}"
              </p>
              <div className="flex-between" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>{review.user_name || review.user_phone}</span>
                <span>{new Date(review.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReviews;
