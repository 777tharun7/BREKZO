import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/Pagination';

const AdminMenuManager = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Lunch',
    dietary_type: 'veg',
    stock_limit: 50,
    current_stock: 50,
    prep_time_minutes: 15,
    calories: '',
    sizesStr: '',
    addonsStr: ''
  });
  
  const canteenId = 1; // Hardcoded for demo
  const itemsPerPage = 10;

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const API_URL = import.meta.env.VITE_API_URL || '';
      
      const [menuRes, catRes] = await Promise.all([
        axios.get(`${API_URL}/api/menu/canteen/${canteenId}`, {
          params: { category, search }
        }),
        axios.get(`${API_URL}/api/menu/canteen/${canteenId}/categories`)
      ]);
      
      setItems(menuRes.data);
      setCategories(catRes.data);
      setCurrentPage(1);
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [category]); // Only refetch automatically on category change

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMenu();
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        await axios.delete(`${API_URL}/api/menu/${itemId}`);
        toast.success('Item deleted');
        fetchMenu();
      } catch (error) {
        toast.error('Failed to delete item');
      }
    }
  };

  const toggleAvailability = async (item) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      await axios.put(`${API_URL}/api/menu/${item.id}`, {
        is_available: !item.is_available
      });
      toast.success(`${item.name} availability updated`);
      
      // Optimistic update
      setItems(prev => prev.map(i => 
        i.id === item.id ? { ...i, is_available: !i.is_available } : i
      ));
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      const parseArrayToStr = (arr) => arr && arr.length ? arr.map(i => `${i.name}:${i.price}`).join(', ') : '';
      setFormData({
        name: item.name,
        description: item.description || '',
        price: item.price,
        category: item.category,
        dietary_type: item.dietary_type,
        stock_limit: item.stock_limit,
        current_stock: item.current_stock,
        prep_time_minutes: item.prep_time_minutes || 15,
        calories: item.calories || '',
        sizesStr: typeof item.sizes === 'string' ? parseArrayToStr(JSON.parse(item.sizes)) : parseArrayToStr(item.sizes),
        addonsStr: typeof item.addons === 'string' ? parseArrayToStr(JSON.parse(item.addons)) : parseArrayToStr(item.addons)
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '', description: '', price: '', category: 'Lunch', 
        dietary_type: 'veg', stock_limit: 50, current_stock: 50, 
        prep_time_minutes: 15, calories: '', sizesStr: '', addonsStr: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const parseStrToArray = (str) => {
        if (!str || !str.trim()) return [];
        return str.split(',').map(s => {
          const [n, p] = s.split(':');
          return { name: n.trim(), price: parseFloat(p) || 0 };
        });
      };
      
      const API_URL = import.meta.env.VITE_API_URL || '';
      const payload = { 
        ...formData, 
        canteen_id: canteenId,
        sizes: parseStrToArray(formData.sizesStr),
        addons: parseStrToArray(formData.addonsStr)
      };
      delete payload.sizesStr;
      delete payload.addonsStr;
      if (editingItem) {
        await axios.put(`${API_URL}/api/menu/${editingItem.id}`, payload);
        toast.success('Item updated successfully');
      } else {
        await axios.post(`${API_URL}/api/menu/`, payload);
        toast.success('Item added successfully');
      }
      closeModal();
      fetchMenu();
    } catch (error) {
      toast.error(editingItem ? 'Failed to update item' : 'Failed to add item');
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = items.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h2>Menu Manager</h2>
          <p className="text-secondary">Add, edit, or remove catalog items</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={20} /> Add New Item
        </button>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ margin: 0, flex: '1 1 300px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder="Search items by name..."
                style={{ paddingLeft: '2.5rem' }}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={20} className="text-secondary" />
            <select 
              className="input-field" 
              value={category} 
              onChange={e => setCategory(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary">Search</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--bg-input)' }}>
              <tr>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Item Name</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Category</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Price</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Stock</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>Loading...</td>
                </tr>
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No items found</td>
                </tr>
              ) : (
                currentItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: 500 }}>{item.name}</div>
                      <div className="badge badge-brand" style={{ fontSize: '0.65rem', marginTop: '0.25rem' }}>
                        {item.dietary_type}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{item.category}</td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>₹{item.price}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span className={item.current_stock < 10 ? 'text-error font-bold' : ''}>
                        {item.current_stock} / {item.stock_limit}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      {/* Simple Toggle Switch */}
                      <div 
                        style={{ 
                          width: '40px', height: '20px', 
                          backgroundColor: item.is_available ? 'var(--status-success)' : 'var(--text-muted)', 
                          borderRadius: '10px', position: 'relative', cursor: 'pointer',
                          transition: 'background-color 0.3s'
                        }}
                        onClick={() => toggleAvailability(item)}
                      >
                        <div style={{ 
                          width: '16px', height: '16px', backgroundColor: 'white', 
                          borderRadius: '50%', position: 'absolute', top: '2px', 
                          left: item.is_available ? '22px' : '2px',
                          transition: 'left 0.3s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <button 
                        className="btn btn-sm text-brand" 
                        style={{ padding: '0.5rem', marginRight: '0.5rem' }}
                        onClick={() => openModal(item)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        className="btn btn-sm text-error" 
                        style={{ padding: '0.5rem' }}
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {!loading && items.length > 0 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <Pagination 
              totalItems={items.length}
              itemsPerPage={itemsPerPage}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Item Name *</label>
                <input type="text" className="input-field" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              
              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Description</label>
                <textarea className="input-field" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Price (₹) *</label>
                  <input type="number" className="input-field" required min="0" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Category *</label>
                  <select className="input-field" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Dietary Type *</label>
                  <select className="input-field" required value={formData.dietary_type} onChange={e => setFormData({...formData, dietary_type: e.target.value})}>
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                    <option value="vegan">Vegan</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Calories</label>
                  <input type="number" className="input-field" value={formData.calories} onChange={e => setFormData({...formData, calories: parseInt(e.target.value) || ''})} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Stock Limit *</label>
                  <input type="number" className="input-field" required min="0" value={formData.stock_limit} onChange={e => setFormData({...formData, stock_limit: parseInt(e.target.value) || 0})} />
                </div>
                {editingItem && (
                  <div style={{ flex: 1 }}>
                    <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Current Stock *</label>
                    <input type="number" className="input-field" required min="0" value={formData.current_stock} onChange={e => setFormData({...formData, current_stock: parseInt(e.target.value) || 0})} />
                  </div>
                )}
              </div>

              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Sizes (Format: Small:0, Large:50)</label>
                <input type="text" className="input-field" placeholder="e.g. Regular:0, Large:30" value={formData.sizesStr} onChange={e => setFormData({...formData, sizesStr: e.target.value})} />
              </div>

              <div>
                <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Add-ons (Format: Extra Cheese:20, Mayo:10)</label>
                <input type="text" className="input-field" placeholder="e.g. Extra Cheese:20" value={formData.addonsStr} onChange={e => setFormData({...formData, addonsStr: e.target.value})} />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingItem ? 'Save Changes' : 'Add Item'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuManager;
