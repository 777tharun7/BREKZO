import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import { User as UserIcon, Bell, Shield, Phone, LogOut } from 'lucide-react';

const StudentProfile = () => {
  const { user, logout } = useAuth();
  const [name, setName] = useState('');
  const [allergies, setAllergies] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [saving, setSaving] = useState(false);

  const availableAllergies = ['Dairy', 'Gluten', 'Nuts', 'Seafood', 'Soy'];
  const availablePreferences = ['Vegan', 'Vegetarian', 'Jain', 'High Protein'];

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAllergies(user.allergies || []);
      setPreferences(user.preferences || []);
    }
  }, [user]);

  const toggleArrayItem = (item, array, setArray) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await axios.patch(`${API_URL}/api/student/${user.id}/profile`, {
        name,
        allergies,
        preferences
      });
      
      // Update local storage (simulated context update)
      const updatedUser = { ...user, name, allergies, preferences };
      localStorage.setItem('breakzo_user', JSON.stringify(updatedUser));
      
      toast.success('Profile updated successfully!');
      // Force reload to update context (in a real app, we'd update context directly)
      window.location.reload();
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2>Profile</h2>
        <p className="text-secondary">Manage your preferences and settings</p>
      </div>

      <div className="card" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', 
          backgroundColor: 'var(--brand-primary)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.5rem', margin: '0 auto 1rem', fontWeight: 'bold'
        }}>
          {name.charAt(0) || 'S'}
        </div>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>{name}</h3>
        <div className="text-secondary flex-center" style={{ gap: '0.5rem' }}>
          <Phone size={16} /> {user.phone}
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserIcon size={20} /> Personal Details
        </h3>
        <div className="input-group">
          <label className="input-label">Full Name</label>
          <input 
            type="text" 
            className="input-field" 
            value={name} 
            onChange={e => setName(e.target.value)} 
          />
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Shield size={20} /> Dietary Requirements
        </h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Food Allergies</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availableAllergies.map(allergy => (
              <button 
                key={allergy}
                className={`btn btn-sm ${allergies.includes(allergy) ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => toggleArrayItem(allergy, allergies, setAllergies)}
                style={{ borderRadius: '999px' }}
              >
                {allergy}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="input-label" style={{ display: 'block', marginBottom: '0.75rem' }}>Dietary Preferences</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {availablePreferences.map(pref => (
              <button 
                key={pref}
                className={`btn btn-sm ${preferences.includes(pref) ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => toggleArrayItem(pref, preferences, setPreferences)}
                style={{ borderRadius: '999px' }}
              >
                {pref}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={20} /> Notifications
        </h3>
        <div className="flex-between">
          <div>
            <div style={{ fontWeight: 500 }}>Push Notifications</div>
            <div className="text-secondary" style={{ fontSize: '0.875rem' }}>Get updates about your order status</div>
          </div>
          {/* Simple toggle switch UI */}
          <div style={{ width: '40px', height: '24px', backgroundColor: 'var(--brand-primary)', borderRadius: '12px', position: 'relative' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: 'white', borderRadius: '50%', position: 'absolute', top: '2px', right: '2px' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button 
          className="btn btn-outline" 
          style={{ flex: 1 }}
          onClick={logout}
        >
          <LogOut size={18} /> Logout
        </button>
        <button 
          className="btn btn-primary" 
          style={{ flex: 1 }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

export default StudentProfile;
