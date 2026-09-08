import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, ArrowLeft, Clock } from 'lucide-react';
import Pagination from '../../components/Pagination';

const Menu = () => {
  const { id: canteenId } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, cartCount, cartTotal } = useCart();
  const { user } = useAuth();
  
  const [canteen, setCanteen] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [dietFilter, setDietFilter] = useState('all'); // 'all', 'veg', 'non-veg'
  
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Customization State
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  
  // Checkout State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [orderTiming, setOrderTiming] = useState('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitPhone, setSplitPhone] = useState('');
  
  const itemsPerPage = 12;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        const [canteenRes, categoriesRes] = await Promise.all([
          axios.get(`${API_URL}/api/canteens/${canteenId}`),
          axios.get(`${API_URL}/api/menu/canteen/${canteenId}/categories`)
        ]);
        
        setCanteen(canteenRes.data);
        setCategories(categoriesRes.data);
      } catch (error) {
        toast.error('Failed to load menu data');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canteenId]);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${API_URL}/api/menu/canteen/${canteenId}`, {
          params: { category: activeCategory, search }
        });
        setMenuItems(res.data);
        setCurrentPage(1); // Reset page on filter change
      } catch (error) {
        console.error(error);
      }
    };
    fetchMenu();
  }, [canteenId, activeCategory, search]);

  const getCartQuantity = (itemId) => {
    return cart.filter(c => c.id === itemId).reduce((sum, c) => sum + c.quantity, 0);
  };

  const handleAddToCartClick = (item) => {
    const hasSizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes).length > 0 : (item.sizes && item.sizes.length > 0);
    const hasAddons = typeof item.addons === 'string' ? JSON.parse(item.addons).length > 0 : (item.addons && item.addons.length > 0);
    
    if (hasSizes || hasAddons) {
      setActiveItem(item);
      const parsedSizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : (item.sizes || []);
      setSelectedSize(parsedSizes.length > 0 ? parsedSizes[0] : null);
      setSelectedAddons([]);
      setIsCustomizing(true);
    } else {
      addToCart(item, parseInt(canteenId));
    }
  };

  const confirmCustomization = () => {
    if (!activeItem) return;
    const finalPrice = activeItem.price + (selectedSize ? selectedSize.price : 0) + selectedAddons.reduce((sum, a) => sum + a.price, 0);
    
    const customizedItem = {
      ...activeItem,
      price: finalPrice,
      customizations: {
        size: selectedSize ? selectedSize.name : null,
        addons: selectedAddons.map(a => a.name)
      }
    };
    
    addToCart(customizedItem, parseInt(canteenId));
    setIsCustomizing(false);
    setActiveItem(null);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    
    setIsPlacingOrder(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const orderPayload = {
        user_id: user.id, // Dynamically passing the logged in user's ID
        canteen_id: parseInt(canteenId),
        items: cart.map(c => ({
          id: c.id,
          name: c.name,
          price: c.price,
          quantity: c.quantity,
          customizations: c.customizations
        })),
        payment_method: paymentMethod,
        promo_code: promoCode || null,
        scheduled_time: orderTiming === 'later' ? scheduledTime : null,
        split_phone: isSplitting && paymentMethod === 'wallet' ? splitPhone : null
      };
      
      const res = await axios.post(`${API_URL}/api/orders/`, orderPayload);
      toast.success('Order placed successfully!');
      
      const { clearCart } = await import('../../context/CartContext'); 
      // Workaround to clear cart since we have the context:
      const savedCart = localStorage.getItem('breakzo_cart');
      if(savedCart) {
         localStorage.removeItem('breakzo_cart');
         localStorage.removeItem('breakzo_cart_canteen');
         navigate(`/user/orders/${res.data.id}`);
      } else {
         navigate(`/user/orders/${res.data.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to place order');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Filter by diet and group items by category
  const filteredItems = menuItems.filter(item => {
    if (dietFilter === 'all') return true;
    if (dietFilter === 'veg') return item.dietary_type === 'veg' || item.dietary_type === 'vegan';
    if (dietFilter === 'non-veg') return item.dietary_type === 'non-veg';
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}>Loading menu...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '80px' }}>
      <button 
        className="btn btn-secondary btn-sm" 
        onClick={() => navigate('/user')}
        style={{ marginBottom: '1rem' }}
      >
        <ArrowLeft size={16} /> Back to Canteens
      </button>

      {canteen && (
        <div style={{ marginBottom: '2rem' }}>
          <h2>{canteen.name} Menu</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <span className={`badge ${canteen.is_open ? 'badge-veg' : 'badge-nonveg'}`}>
              {canteen.is_open ? 'OPEN' : 'CLOSED'}
            </span>
            <span className="text-secondary flex-center" style={{ gap: '0.25rem', fontSize: '0.875rem' }}>
              <Clock size={16} /> {canteen.wait_time_minutes} min wait
            </span>
          </div>
        </div>
      )}

      {/* Hero Banner & Today's Special Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Main Hero Banner */}
        <div style={{
          position: 'relative',
          borderRadius: '1.25rem',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(20, 25, 35, 0.95), rgba(15, 20, 28, 0.98))',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          minHeight: '220px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{ flex: '1 1 55%', zIndex: 2, paddingRight: '1rem' }}>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1.15, margin: 0, color: '#fff' }}>
              Good Food<br />
              <span style={{ color: 'var(--brand-primary, #FF6B35)' }}>Brighter Breaks.</span>
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.95rem', margin: '0.75rem 0 1.25rem 0' }}>
              Fresh meals, quick service, happy you.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', color: '#fff' }}>
                🌱 Fresh Ingredients
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', color: '#fff' }}>
                ⚡ Quick Service
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.78rem', color: '#fff' }}>
                ❤️ Loved by Many
              </span>
            </div>
          </div>

          <div style={{ flex: '1 1 45%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: '210px',
              height: '170px',
              borderRadius: '1rem',
              overflow: 'hidden',
              boxShadow: '0 15px 30px rgba(0,0,0,0.6)',
              position: 'relative'
            }}>
              <img 
                src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=80" 
                alt="Delicious Biryani" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                background: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(8px)',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                color: '#fff',
                fontWeight: 600
              }}>
                Freshly Made ✨
              </div>
            </div>
          </div>
        </div>

        {/* Today's Special Card */}
        <div style={{
          borderRadius: '1.25rem',
          background: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)',
          color: '#431407',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 10px 25px -5px rgba(249, 115, 22, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#C2410C' }}>
              Today's Special
            </span>
            <h3 style={{ margin: '0.25rem 0 0.25rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#431407' }}>
              Masala Chai
            </h3>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#EA580C' }}>
              Just ₹20
            </p>
            <button 
              className="btn btn-primary btn-sm"
              style={{
                marginTop: '1rem',
                background: 'linear-gradient(135deg, #EA580C, #C2410C)',
                boxShadow: '0 4px 12px rgba(194, 65, 12, 0.3)',
                padding: '0.4rem 1rem',
                fontSize: '0.85rem'
              }}
              onClick={() => {
                const chai = menuItems.find(i => i.name.toLowerCase().includes('chai'));
                if (chai) addToCart(chai, parseInt(canteenId));
              }}
            >
              Order Now →
            </button>
          </div>
          <div style={{ width: '120px', height: '120px', borderRadius: '1rem', overflow: 'hidden', flexShrink: 0, boxShadow: '0 8px 16px rgba(0,0,0,0.15)' }}>
            <img 
              src="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80" 
              alt="Masala Chai" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div className="input-group" style={{ margin: 0, flex: '1 1 320px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search for dishes, cuisines, or keywords..."
              style={{ paddingLeft: '2.5rem', borderRadius: '999px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem', flex: '1 1 100%', alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${activeCategory === 'All' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveCategory('All')}
            style={{ borderRadius: '999px', padding: '0.45rem 1.1rem', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            🎛️ All
          </button>
          
          {categories.map(cat => {
            let icon = '🍴';
            if (cat.toLowerCase().includes('bev')) icon = '🥤';
            else if (cat.toLowerCase().includes('break')) icon = '☀️';
            else if (cat.toLowerCase().includes('lunch')) icon = '🍽️';
            else if (cat.toLowerCase().includes('snack')) icon = '🍟';
            else if (cat.toLowerCase().includes('dessert')) icon = '🍰';
            else if (cat.toLowerCase().includes('health')) icon = '🥗';
            
            return (
              <button
                key={cat}
                className={`btn btn-sm ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveCategory(cat)}
                style={{ borderRadius: '999px', padding: '0.45rem 1.1rem', gap: '0.4rem', whiteSpace: 'nowrap' }}
              >
                <span>{icon}</span> {cat}
              </button>
            );
          })}
          
          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 0.5rem' }}></div>
          
          <button 
            className={`btn btn-sm ${dietFilter === 'veg' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '999px', padding: '0.45rem 1rem', whiteSpace: 'nowrap', border: dietFilter === 'veg' ? 'none' : '1px solid var(--veg-color, #10B981)', color: dietFilter === 'veg' ? 'white' : 'var(--veg-color, #10B981)', backgroundColor: dietFilter === 'veg' ? 'var(--veg-color, #10B981)' : 'transparent' }}
            onClick={() => setDietFilter(dietFilter === 'veg' ? 'all' : 'veg')}
          >
            🌱 Veg Only
          </button>
          <button 
            className={`btn btn-sm ${dietFilter === 'non-veg' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderRadius: '999px', padding: '0.45rem 1rem', whiteSpace: 'nowrap', border: dietFilter === 'non-veg' ? 'none' : '1px solid var(--nonveg-color, #EF4444)', color: dietFilter === 'non-veg' ? 'white' : 'var(--nonveg-color, #EF4444)', backgroundColor: dietFilter === 'non-veg' ? 'var(--nonveg-color, #EF4444)' : 'transparent' }}
            onClick={() => setDietFilter(dietFilter === 'non-veg' ? 'all' : 'non-veg')}
          >
            🍗 Non-Veg
          </button>
        </div>
      </div>

      {/* Menu Categories and Grid */}
      {Object.keys(groupedItems).length > 0 ? (
        Object.keys(groupedItems).map(category => (
          <div key={category} style={{ marginBottom: '3.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {category}
                </h3>
                <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                  {category.toLowerCase().includes('bev') && 'Coolers, hot drinks and refreshing beverages'}
                  {category.toLowerCase().includes('break') && 'Start your day with something special'}
                  {category.toLowerCase().includes('lunch') && 'Wholesome, filling and nutritious meals'}
                  {category.toLowerCase().includes('snack') && 'Crispy bites and quick refreshments'}
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--brand-primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setActiveCategory(category)}>
                View All →
              </span>
            </div>

            <motion.div 
              className="grid-cards" 
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}
              initial="hidden"
              animate="visible"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.04
                  }
                }
              }}
            >
              {groupedItems[category].map(item => {
                const cartQty = getCartQuantity(item.id);
                const isOutOfStock = item.current_stock <= 0;
                
                // Dietary styling
                const isVegan = item.dietary_type === 'vegan';
                const isVeg = item.dietary_type === 'veg';
                const badgeColor = isVegan ? '#8B5CF6' : (isVeg ? '#10B981' : '#EF4444');
                const badgeText = isVegan ? '🌱 VEGAN' : (isVeg ? '🍃 VEG' : '🍗 NON-VEG');
                
                return (
                  <motion.div 
                    key={item.id} 
                    className="card card-hover" 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      opacity: isOutOfStock ? 0.6 : 1,
                      borderRadius: '1.1rem',
                      overflow: 'hidden',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 8px 20px -6px rgba(0,0,0,0.35)'
                    }}
                    variants={{
                      hidden: { opacity: 0, y: 15 },
                      visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 25 } }
                    }}
                    whileHover={{ scale: 1.02, y: -4 }}
                  >
                    {/* Food Photo Container */}
                    <div style={{ position: 'relative', width: '100%', height: '170px', overflow: 'hidden', background: '#1e293b' }}>
                      <img 
                        src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'} 
                        alt={item.name} 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          transition: 'transform 0.4s ease'
                        }}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
                        }}
                      />
                      
                      {/* Dietary Badge Overlay */}
                      <div style={{ 
                        position: 'absolute', 
                        top: '10px', 
                        right: '10px', 
                        background: 'rgba(15, 23, 42, 0.8)', 
                        backdropFilter: 'blur(6px)',
                        padding: '4px 10px', 
                        borderRadius: '999px',
                        border: `1px solid ${badgeColor}`,
                        color: badgeColor,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        letterSpacing: '0.04em'
                      }}>
                        {badgeText}
                      </div>
                    </div>

                    {/* Content Section */}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.name}
                      </h4>
                      <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '1rem', flex: 1, lineHeight: 1.4 }}>
                        {item.description}
                      </p>
                      
                      <div style={{ fontWeight: 800, fontSize: '1.35rem', color: 'var(--brand-primary, #FF6B35)', marginBottom: '0.5rem' }}>
                        ₹{item.price}
                      </div>

                      {item.current_stock > 0 && item.current_stock <= 10 && (
                        <div className="text-warning" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                          ⚠️ Only {item.current_stock} left in stock!
                        </div>
                      )}
                      {isOutOfStock && (
                        <div className="text-error" style={{ fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                          🚫 Out of Stock
                        </div>
                      )}
                    </div>
                    
                    {/* Action Bar (Stepper + Add to Cart) */}
                    <div style={{ 
                      padding: '0.85rem 1.25rem', 
                      borderTop: '1px solid var(--border-color)', 
                      backgroundColor: 'rgba(0, 0, 0, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        background: 'var(--bg-input)', 
                        borderRadius: '0.6rem',
                        border: '1px solid var(--border-color)',
                        padding: '2px'
                      }}>
                        <button 
                          className="btn btn-sm" 
                          style={{ padding: '0.35rem 0.6rem', minWidth: '32px', color: 'var(--text-primary)' }}
                          onClick={() => removeFromCart(item.id)}
                          disabled={cartQty === 0}
                        >
                          <Minus size={14} />
                        </button>
                        <span style={{ fontWeight: 700, minWidth: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
                          {cartQty}
                        </span>
                        <button 
                          className="btn btn-sm" 
                          style={{ padding: '0.35rem 0.6rem', minWidth: '32px', color: 'var(--text-primary)' }}
                          onClick={() => addToCart(item, parseInt(canteenId))}
                          disabled={cartQty >= item.current_stock || isOutOfStock}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button 
                        className="btn btn-primary" 
                        style={{ 
                          flex: 1, 
                          padding: '0.6rem 1rem', 
                          fontSize: '0.9rem', 
                          borderRadius: '0.6rem',
                          gap: '0.4rem',
                          background: cartQty > 0 
                            ? 'linear-gradient(135deg, #10B981, #059669)' 
                            : 'linear-gradient(135deg, #FF6B35, #F97316)'
                        }}
                        onClick={() => handleAddToCartClick(item)}
                        disabled={isOutOfStock || !canteen?.is_open}
                      >
                        <ShoppingCart size={15} />
                        {cartQty > 0 ? `Added (${cartQty})` : 'Add to Cart'}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        ))
      ) : (
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          No items found matching your search.
        </div>
      )}

      {/* Floating Cart Button */}
      {cartCount > 0 && (
        <div style={{ 
          position: 'fixed', bottom: '5rem', left: 0, right: 0, 
          display: 'flex', justifyContent: 'center', zIndex: 40, pointerEvents: 'none'
        }}>
          <button 
            className="btn btn-primary" 
            style={{ 
              borderRadius: '999px', padding: '1rem 2rem', 
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 10px 25px -5px rgba(255, 107, 53, 0.5)'
            }}
            onClick={() => setIsCheckoutOpen(true)}
          >
            <ShoppingCart size={20} />
            <span>{cartCount} items | ₹{cartTotal}</span>
            <span style={{ fontWeight: 'bold' }}>View Cart</span>
          </button>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setIsCheckoutOpen(false)}>
          <div 
            className="card animate-slide-up" 
            style={{ width: '100%', maxWidth: '500px', borderRadius: '1.5rem 1.5rem 0 0', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Checkout</h2>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsCheckoutOpen(false)}>Close</button>
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              {cart.map(item => (
                <div key={item.cartItemId} className="flex-between" style={{ marginBottom: '0.75rem', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{item.name}</div>
                    {(item.customizations?.size || (item.customizations?.addons && item.customizations.addons.length > 0)) && (
                      <div className="text-secondary" style={{ fontSize: '0.75rem' }}>
                        {item.customizations.size && `Size: ${item.customizations.size}`}
                        {item.customizations.addons && item.customizations.addons.length > 0 && ` | Add-ons: ${item.customizations.addons.join(', ')}`}
                      </div>
                    )}
                    <div className="text-secondary" style={{ fontSize: '0.875rem' }}>₹{item.price} x {item.quantity}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</div>
                    <button className="text-error" style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => removeFromCart(item.cartItemId)}>
                      <Minus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Promo Code</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" className="input-field" placeholder="Try BREAKZO20" value={promoCode} onChange={e => setPromoCode(e.target.value)} />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Order Timing</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className={`btn ${orderTiming === 'now' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setOrderTiming('now')}>
                  Prepare Now
                </button>
                <button className={`btn ${orderTiming === 'later' ? 'btn-primary' : 'btn-outline'}`} style={{ flex: 1 }} onClick={() => setOrderTiming('later')}>
                  Schedule Later
                </button>
              </div>
              {orderTiming === 'later' && (
                <input type="datetime-local" className="input-field" style={{ marginTop: '0.5rem' }} value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Payment Method</label>
              <select className="input-field" value={paymentMethod} onChange={e => { setPaymentMethod(e.target.value); setIsSplitting(false); }}>
                <option value="wallet">Campus Wallet</option>
                <option value="upi">UPI / Card</option>
              </select>
            </div>

            {paymentMethod === 'wallet' && (
              <div style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-input)', padding: '1rem', borderRadius: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500 }}>
                  <input type="checkbox" checked={isSplitting} onChange={e => setIsSplitting(e.target.checked)} />
                  Split the Bill (50/50) with a Friend
                </label>
                
                {isSplitting && (
                  <div className="animate-fade-in" style={{ marginTop: '1rem' }}>
                    <label className="text-secondary" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Friend's Phone Number</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. 7777777777" 
                      value={splitPhone}
                      onChange={e => setSplitPhone(e.target.value)}
                    />
                    <div className="text-secondary" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      They will be charged ₹{cartTotal / 2} and you will be charged ₹{cartTotal / 2}.
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="flex-between" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                <span>Total</span>
                <span className="text-brand">₹{cartTotal}</span>
              </div>
            </div>
            
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={handlePlaceOrder} disabled={isPlacingOrder || cart.length === 0}>
              {isPlacingOrder ? 'Processing...' : 'Pay & Place Order'}
            </button>
          </div>
        </div>
      )}

      {/* Customizations Modal */}
      {isCustomizing && activeItem && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }} onClick={() => setIsCustomizing(false)}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: '0.5rem' }}>Customize {activeItem.name}</h3>
            <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Base Price: ₹{activeItem.price}</p>
            
            {(() => {
              const sizes = typeof activeItem.sizes === 'string' ? JSON.parse(activeItem.sizes) : (activeItem.sizes || []);
              const addons = typeof activeItem.addons === 'string' ? JSON.parse(activeItem.addons) : (activeItem.addons || []);
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {sizes.length > 0 && (
                    <div>
                      <h4 style={{ marginBottom: '0.5rem' }}>Select Size</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {sizes.map((sz, idx) => (
                          <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" name="size" checked={selectedSize?.name === sz.name} onChange={() => setSelectedSize(sz)} />
                            <span>{sz.name} (+₹{sz.price})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {addons.length > 0 && (
                    <div>
                      <h4 style={{ marginBottom: '0.5rem' }}>Add-ons (Optional)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {addons.map((addon, idx) => {
                          const isChecked = selectedAddons.some(a => a.name === addon.name);
                          return (
                            <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                              <input type="checkbox" checked={isChecked} onChange={() => {
                                if (isChecked) setSelectedAddons(prev => prev.filter(a => a.name !== addon.name));
                                else setSelectedAddons(prev => [...prev, addon]);
                              }} />
                              <span>{addon.name} (+₹{addon.price})</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsCustomizing(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={confirmCustomization}>Add to Cart</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
