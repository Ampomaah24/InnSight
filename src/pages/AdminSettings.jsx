import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import '../assets/styles/AdminSettings.css';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('taxes');
  const [notification, setNotification] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [dbError, setDbError] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const navigate = useNavigate();
  
  // Settings state objects
  const [taxSettings, setTaxSettings] = useState({
    nhilRate: 2.5,
    vatRate: 12.5,
    serviceTaxRate: 5,
    cityTaxRate: 2,
    taxIncluded: false
  });
  
  const [discountSettings, setDiscountSettings] = useState({
    conferenceAttendeeDiscount: 15,
    corporateDiscount: 15,
    weekdayDiscount: 5,
    longStayDiscount: 12,
    longStayMinNights: 7,
    groupDiscountRate: 8,
    groupDiscountMinRooms: 3
  });
  
  const [promotionSettings, setPromotionSettings] = useState([
    {
      id: 'summer2023',
      name: 'Summer Special 2023',
      discountRate: 20,
      startDate: new Date('2023-06-01'),
      endDate: new Date('2023-08-31'),
      active: true,
      code: 'SUMMER23',
      description: 'Summer season discount for all room types',
      roomTypes: ['all']
    }
  ]);
  
  const [seasonalSettings, setSeasonalSettings] = useState([
    {
      id: 'peak',
      name: 'Peak Season',
      startDate: new Date('2023-12-15'),
      endDate: new Date('2024-01-15'),
      priceMultiplier: 1.5,
      active: true
    },
    {
      id: 'lowSeason',
      name: 'Low Season',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-04-30'),
      priceMultiplier: 0.8,
      active: true
    }
  ]);
  
  // General settings
  const [generalSettings, setGeneralSettings] = useState({
    defaultCheckInTime: '14:00',
    defaultCheckOutTime: '11:00',
    lateCheckoutFee: 50,
    requireDepositPercentage: 25,
    cancellationFee: 20,
    freeCancellationHours: 48,
    currency: 'USD'
  });

  // Check authentication state
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (!user) {
        console.warn('User not authenticated');
        navigate("/login");
        return;
      }
      
      // Check user role from Firestore
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
          
          // Both admin and superadmin can view settings
          if (userData.role === 'superadmin') {
            setIsViewOnly(false); 
            fetchSettings();
          } else if (userData.role === 'admin') {
            setIsViewOnly(true); 
            fetchSettings();
          } else {
            // Non-admin users are redirected
            navigate("/services");
          }
        } else {
          console.warn('No user role found.');
          navigate("/services");
        }
      } catch (error) {
        console.error("Error checking user role:", error);
        setDbError(true);
      }
    });
    
    return () => unsubscribe();
  }, [navigate]);

  // Load settings from local storage if available
  useEffect(() => {
    if (dbError) {
      try {
        const localTaxes = localStorage.getItem('settings_taxes');
        if (localTaxes) setTaxSettings(JSON.parse(localTaxes));
        
        const localDiscounts = localStorage.getItem('settings_discounts');
        if (localDiscounts) setDiscountSettings(JSON.parse(localDiscounts));
        
        const localPromotions = localStorage.getItem('settings_promotions');
        if (localPromotions) setPromotionSettings(JSON.parse(localPromotions));
        
        const localSeasonal = localStorage.getItem('settings_seasonal');
        if (localSeasonal) setSeasonalSettings(JSON.parse(localSeasonal));
        
        const localGeneral = localStorage.getItem('settings_general');
        if (localGeneral) setGeneralSettings(JSON.parse(localGeneral));
        
        setLoading(false);
        showNotification('Loaded settings from local storage', 'info');
      } catch (e) {
        console.error('Error loading from localStorage:', e);
        setLoading(false);
      }
    }
  }, [dbError]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      try {
        // Fetch tax settings
        const taxDoc = await getDoc(doc(db, 'settings', 'taxes'));
        if (taxDoc.exists()) {
          setTaxSettings(taxDoc.data());
        }
      } catch (error) {
        console.warn('Could not fetch tax settings:', error);
      }
      
      try {
        // Fetch discount settings
        const discountDoc = await getDoc(doc(db, 'settings', 'discounts'));
        if (discountDoc.exists()) {
          setDiscountSettings(discountDoc.data());
        }
      } catch (error) {
        console.warn('Could not fetch discount settings:', error);
      }
      
      try {
        // Fetch promotions
        const promotionDoc = await getDoc(doc(db, 'settings', 'promotions'));
        if (promotionDoc.exists() && promotionDoc.data().items) {
          const promotions = promotionDoc.data().items.map(promo => ({
            ...promo,
            startDate: promo.startDate instanceof Timestamp ? 
              promo.startDate.toDate() : new Date(promo.startDate),
            endDate: promo.endDate instanceof Timestamp ? 
              promo.endDate.toDate() : new Date(promo.endDate)
          }));
          setPromotionSettings(promotions);
        }
      } catch (error) {
        console.warn('Could not fetch promotion settings:', error);
      }
      
      try {
        // Fetch seasonal pricing
        const seasonalDoc = await getDoc(doc(db, 'settings', 'seasonal'));
        if (seasonalDoc.exists() && seasonalDoc.data().items) {
          const seasons = seasonalDoc.data().items.map(season => ({
            ...season,
            startDate: season.startDate instanceof Timestamp ? 
              season.startDate.toDate() : new Date(season.startDate),
            endDate: season.endDate instanceof Timestamp ? 
              season.endDate.toDate() : new Date(season.endDate)
          }));
          setSeasonalSettings(seasons);
        }
      } catch (error) {
        console.warn('Could not fetch seasonal settings:', error);
      }
      
      try {
        // Fetch general settings
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists()) {
          setGeneralSettings(generalDoc.data());
        }
      } catch (error) {
        console.warn('Could not fetch general settings:', error);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error in fetchSettings:', error);
      showNotification('Loading default settings due to database connection issues', 'warning');
      setLoading(false);
    }
  };

  const saveSettings = async (settingType) => {
    if (isViewOnly || userRole !== 'superadmin') {
      showNotification('You do not have permission to save settings. Only superadmin users can modify settings.', 'error');
      return;
    }
    
    try {
      setSaving(true);
      
      // Create a reference to the collection
      const settingsCollection = collection(db, 'settings');
      
      switch (settingType) {
        case 'taxes':
          try {
            // First try to update if document exists
            const taxData = {
              ...taxSettings,
              lastUpdated: Timestamp.now()
            };
            
            try {
              await updateDoc(doc(settingsCollection, 'taxes'), taxData);
            } catch (updateError) {
              await setDoc(doc(settingsCollection, 'taxes'), taxData, { merge: true });
            }
          } catch (error) {
            throw new Error(`Firebase error saving taxes: ${error.message}`);
          }
          break;
        
        case 'discounts':
          try {
            const discountData = {
              ...discountSettings,
              lastUpdated: Timestamp.now()
            };
            
            try {
              await updateDoc(doc(settingsCollection, 'discounts'), discountData);
            } catch (updateError) {
              await setDoc(doc(settingsCollection, 'discounts'), discountData, { merge: true });
            }
          } catch (error) {
            throw new Error(`Firebase error saving discounts: ${error.message}`);
          }
          break;
        
        case 'promotions':
          try {
            const promotionsForFirestore = {
              items: promotionSettings.map(promo => ({
                ...promo,
                startDate: Timestamp.fromDate(new Date(promo.startDate)),
                endDate: Timestamp.fromDate(new Date(promo.endDate))
              })),
              lastUpdated: Timestamp.now()
            };
            
            try {
              await updateDoc(doc(settingsCollection, 'promotions'), promotionsForFirestore);
            } catch (updateError) {
              await setDoc(doc(settingsCollection, 'promotions'), promotionsForFirestore, { merge: true });
            }
          } catch (error) {
            throw new Error(`Firebase error saving promotions: ${error.message}`);
          }
          break;
        
        case 'seasonal':
          try {
            // Convert JS dates to Firestore timestamps for seasonal pricing
            const seasonsForFirestore = {
              items: seasonalSettings.map(season => ({
                ...season,
                startDate: Timestamp.fromDate(new Date(season.startDate)),
                endDate: Timestamp.fromDate(new Date(season.endDate))
              })),
              lastUpdated: Timestamp.now()
            };
            
            try {
              await updateDoc(doc(settingsCollection, 'seasonal'), seasonsForFirestore);
            } catch (updateError) {
              await setDoc(doc(settingsCollection, 'seasonal'), seasonsForFirestore, { merge: true });
            }
          } catch (error) {
            throw new Error(`Firebase error saving seasonal rates: ${error.message}`);
          }
          break;
          
        case 'general':
          try {
            const generalData = {
              ...generalSettings,
              lastUpdated: Timestamp.now()
            };
            
            try {
              await updateDoc(doc(settingsCollection, 'general'), generalData);
            } catch (updateError) {
              await setDoc(doc(settingsCollection, 'general'), generalData, { merge: true });
            }
          } catch (error) {
            throw new Error(`Firebase error saving general settings: ${error.message}`);
          }
          break;
          
        default:
          throw new Error('Unknown settings type');
      }
      
      showNotification(`${settingType.charAt(0).toUpperCase() + settingType.slice(1)} settings saved successfully!`);
      setSaving(false);
    } catch (error) {
      console.error(`Error saving ${settingType} settings:`, error);
      
      // Check for permission errors
      if (error.message && error.message.includes("permission")) {
        showNotification(`Permission denied: Only superadmin users can save settings.`, 'error');
      } else {
        // Store locally even if Firebase save fails
        localStorage.setItem(`settings_${settingType}`, JSON.stringify(
          settingType === 'taxes' ? taxSettings : 
          settingType === 'discounts' ? discountSettings :
          settingType === 'promotions' ? promotionSettings :
          settingType === 'seasonal' ? seasonalSettings :
          generalSettings
        ));
        showNotification(`Settings saved locally. Database error: ${error.message}`, 'warning');
      }
      
      setSaving(false);
    }
  };
  

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 5000); 
  };
  
  // Handle tax settings changes (prevent changes in view-only mode)
  const handleTaxChange = (e) => {
    if (isViewOnly) return; 
    
    const { name, value, type, checked } = e.target;
    setTaxSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
  };
  
  const handleDiscountChange = (e) => {
    if (isViewOnly) return; 
    
    const { name, value, type, checked } = e.target;
    setDiscountSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
  };
  
  // Handle general settings changes (prevent changes in view-only mode)
  const handleGeneralChange = (e) => {
    if (isViewOnly) return; 
    
    const { name, value, type, checked } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle adding a new promotion (prevent in view-0nly mode)
  const addPromotion = () => {
    if (isViewOnly) {
      showNotification("You're in view-only mode. Only superadmin users can add promotions.", 'warning');
      return;
    }
    
    const newPromotion = {
      id: `promo-${Date.now()}`,
      name: 'New Promotion',
      discountRate: 10,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      active: false,
      code: `PROMO${Math.floor(Math.random() * 1000)}`,
      description: 'Description of the promotion',
      roomTypes: ['all']
    };
    
    setPromotionSettings([...promotionSettings, newPromotion]);
  };
  
  // Handle adding a new seasonal rate (prevent in view-only mode)
  const addSeason = () => {
    if (isViewOnly) {
      showNotification("You're in view-only mode. Only superadmin users can add seasonal rates.", 'warning');
      return;
    }
    
    const newSeason = {
      id: `season-${Date.now()}`,
      name: 'New Season',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
      priceMultiplier: 1.0,
      active: false
    };
    
    setSeasonalSettings([...seasonalSettings, newSeason]);
  };
  
  // Handle promotion changes (prevent in view-only mode)
  const handlePromotionChange = (index, field, value) => {
    if (isViewOnly) return; 
    
    const updatedPromotions = [...promotionSettings];
    updatedPromotions[index][field] = value;
    setPromotionSettings(updatedPromotions);
  };
  
  // Handle seasonal rate changes (prevent in view-only mode)
  const handleSeasonalChange = (index, field, value) => {
    if (isViewOnly) return; 
    
    const updatedSeasons = [...seasonalSettings];
    updatedSeasons[index][field] = value;
    setSeasonalSettings(updatedSeasons);
  };
  
  // Handle removing a promotion (prevent in view-only mode)
  const removePromotion = (index) => {
    if (isViewOnly) {
      showNotification("You're in view-only mode. Only superadmin users can remove promotions.", 'warning');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      const updatedPromotions = [...promotionSettings];
      updatedPromotions.splice(index, 1);
      setPromotionSettings(updatedPromotions);
    }
  };
  
  // Handle removing a seasonal rate (prevent in view-only mode)
  const removeSeason = (index) => {
    if (isViewOnly) {
      showNotification("You're in view-only mode. Only superadmin users can remove seasonal rates.", 'warning');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this seasonal rate?')) {
      const updatedSeasons = [...seasonalSettings];
      updatedSeasons.splice(index, 1);
      setSeasonalSettings(updatedSeasons);
    }
  };

  // Format date for input fields
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    return d.toISOString().split('T')[0];
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="page-header">
          <h1 className="page-title">Admin Settings</h1>
          <p className="page-subtitle">Configure pricing, taxes, discounts and promotions</p>
          
          {isViewOnly && (
            <div className="view-only-banner">
              <strong>View-Only Mode:</strong> You can view settings but cannot make changes. 
              Only superadmin users can modify settings.
            </div>
          )}
          
          {dbError && (
            <div className="database-error-banner">
              Working in offline mode. Changes will be saved locally.
            </div>
          )}
        </div>
        
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
        
        <div className="settings-tabs">
          <div 
            className={`settings-tab ${activeTab === 'taxes' ? 'active' : ''}`}
            onClick={() => setActiveTab('taxes')}
          >
            Taxes & Fees
          </div>
          <div 
            className={`settings-tab ${activeTab === 'discounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('discounts')}
          >
            Discounts
          </div>
          <div 
            className={`settings-tab ${activeTab === 'promotions' ? 'active' : ''}`}
            onClick={() => setActiveTab('promotions')}
          >
            Promotions
          </div>
          <div 
            className={`settings-tab ${activeTab === 'seasonal' ? 'active' : ''}`}
            onClick={() => setActiveTab('seasonal')}
          >
            Seasonal Pricing
          </div>
          <div 
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General Settings
          </div>
        </div>
        
        <div className="settings-content">
          {loading ? (
            <div className="settings-loading">Loading settings...</div>
          ) : (
            <>
              {/* Taxes & Fees Settings */}
              {activeTab === 'taxes' && (
                <div className="settings-panel">
                  <h2 className="panel-title">Taxes & Fees</h2>
                  
                  <div className="settings-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="nhilRate">NHIL Rate (%)</label>
                        <input 
                          type="number" 
                          id="nhilRate"
                          name="nhilRate"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxSettings.nhilRate}
                          onChange={handleTaxChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="vatRate">VAT Rate (%)</label>
                        <input 
                          type="number" 
                          id="vatRate"
                          name="vatRate"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxSettings.vatRate}
                          onChange={handleTaxChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="serviceTaxRate">Service Tax Rate (%)</label>
                        <input 
                          type="number" 
                          id="serviceTaxRate"
                          name="serviceTaxRate"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxSettings.serviceTaxRate}
                          onChange={handleTaxChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="cityTaxRate">City/Tourism Tax Rate (%)</label>
                        <input 
                          type="number" 
                          id="cityTaxRate"
                          name="cityTaxRate"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxSettings.cityTaxRate}
                          onChange={handleTaxChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group checkbox-group">
                        <label htmlFor="taxIncluded">
                          <input 
                            type="checkbox" 
                            id="taxIncluded"
                            name="taxIncluded"
                            checked={taxSettings.taxIncluded}
                            onChange={handleTaxChange}
                            disabled={isViewOnly}
                            className={isViewOnly ? 'readonly' : ''}
                          />
                          <span>Rates include taxes</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  {!isViewOnly && (
                    <div className="settings-actions">
                      <button 
                        className="save-button"
                        onClick={() => saveSettings('taxes')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Tax Settings'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Discounts Settings */}
              {activeTab === 'discounts' && (
                <div className="settings-panel">
                  <h2 className="panel-title">Discounts</h2>
                  
                  <div className="settings-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="conferenceAttendeeDiscount">Conference Attendee Discount (%)</label>
                        <input 
                          type="number" 
                          id="conferenceAttendeeDiscount"
                          name="conferenceAttendeeDiscount"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountSettings.conferenceAttendeeDiscount}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="corporateDiscount">Corporate Discount (%)</label>
                        <input 
                          type="number" 
                          id="corporateDiscount"
                          name="corporateDiscount"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountSettings.corporateDiscount}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="weekdayDiscount">Weekday Discount (%)</label>
                        <input 
                          type="number" 
                          id="weekdayDiscount"
                          name="weekdayDiscount"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountSettings.weekdayDiscount}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="longStayDiscount">Long Stay Discount (%)</label>
                        <input 
                          type="number" 
                          id="longStayDiscount"
                          name="longStayDiscount"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountSettings.longStayDiscount}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="longStayMinNights">Long Stay Minimum Nights</label>
                        <input 
                          type="number" 
                          id="longStayMinNights"
                          name="longStayMinNights"
                          min="1"
                          step="1"
                          value={discountSettings.longStayMinNights}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="groupDiscountRate">Group Discount (%)</label>
                        <input 
                          type="number" 
                          id="groupDiscountRate"
                          name="groupDiscountRate"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountSettings.groupDiscountRate}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="groupDiscountMinRooms">Group Discount Minimum Rooms</label>
                        <input 
                          type="number" 
                          id="groupDiscountMinRooms"
                          name="groupDiscountMinRooms"
                          min="1"
                          step="1"
                          value={discountSettings.groupDiscountMinRooms}
                          onChange={handleDiscountChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {!isViewOnly && (
                    <div className="settings-actions">
                      <button 
                        className="save-button"
                        onClick={() => saveSettings('discounts')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Discount Settings'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Promotions Settings */}
              {activeTab === 'promotions' && (
                <div className="settings-panel">
                  <h2 className="panel-title">Promotions</h2>
                  
                  <div className="promotions-list">
                    {promotionSettings.map((promotion, index) => (
                      <div className="promotion-card" key={promotion.id}>
                        <div className="promotion-header">
                          <input
                            type="text"
                            className={`promotion-name ${isViewOnly ? 'readonly' : ''}`}
                            value={promotion.name}
                            onChange={(e) => handlePromotionChange(index, 'name', e.target.value)}
                            readOnly={isViewOnly}
                          />
                          {!isViewOnly && (
                            <button 
                              className="remove-btn"
                              onClick={() => removePromotion(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="promotion-body">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Discount Rate (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={promotion.discountRate}
                                onChange={(e) => handlePromotionChange(index, 'discountRate', parseFloat(e.target.value))}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Promotion Code</label>
                              <input
                                type="text"
                                value={promotion.code}
                                onChange={(e) => handlePromotionChange(index, 'code', e.target.value.toUpperCase())}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                            </div>
                          </div>
                          
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(promotion.startDate)}
                                onChange={(e) => handlePromotionChange(index, 'startDate', new Date(e.target.value))}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>End Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(promotion.endDate)}
                                onChange={(e) => handlePromotionChange(index, 'endDate', new Date(e.target.value))}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                            </div>
                          </div>
                          
                          <div className="form-row">
                            <div className="form-group checkbox-group">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={promotion.active}
                                  onChange={(e) => handlePromotionChange(index, 'active', e.target.checked)}
                                  disabled={isViewOnly}
                                  className={isViewOnly ? 'readonly' : ''}
                                />
                                <span>Active</span>
                              </label>
                            </div>
                          </div>
                          
                          <div className="form-group full-width">
                            <label>Description</label>
                            <textarea
                              rows="2"
                              value={promotion.description}
                              onChange={(e) => handlePromotionChange(index, 'description', e.target.value)}
                              readOnly={isViewOnly}
                              className={isViewOnly ? 'readonly' : ''}
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {promotionSettings.length === 0 && (
                      <div className="empty-state">
                        No promotions created yet. {!isViewOnly && "Click 'Add Promotion' to create one."}
                      </div>
                    )}
                  </div>
                  
                  {!isViewOnly && (
                    <div className="settings-actions">
                      <button 
                        className="add-button"
                        onClick={addPromotion}
                      >
                        Add Promotion
                      </button>
                      
                      <button 
                        className="save-button"
                        onClick={() => saveSettings('promotions')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Promotions'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* Seasonal Pricing Settings */}
              {activeTab === 'seasonal' && (
                <div className="settings-panel">
                  <h2 className="panel-title">Seasonal Pricing</h2>
                  
                  <div className="seasonal-list">
                    {seasonalSettings.map((season, index) => (
                      <div className="season-card" key={season.id}>
                        <div className="season-header">
                          <input
                            type="text"
                            className={`season-name ${isViewOnly ? 'readonly' : ''}`}
                            value={season.name}
                            onChange={(e) => handleSeasonalChange(index, 'name', e.target.value)}
                            readOnly={isViewOnly}
                          />
                          {!isViewOnly && (
                            <button 
                              className="remove-btn"
                              onClick={() => removeSeason(index)}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="season-body">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(season.startDate)}
                                onChange={(e) => handleSeasonalChange(index, 'startDate', new Date(e.target.value))}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>End Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(season.endDate)}
                                onChange={(e) => handleSeasonalChange(index, 'endDate', new Date(e.target.value))}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                            </div>
                          </div>
                          
                          <div className="form-row">
                            <div className="form-group">
                              <label>Price Multiplier</label>
                              <input
                                type="number"
                                min="0.1"
                                max="10"
                                step="0.01"
                                value={season.priceMultiplier}
                                onChange={(e) => handleSeasonalChange(index, 'priceMultiplier', parseFloat(e.target.value))}
                                readOnly={isViewOnly}
                                className={isViewOnly ? 'readonly' : ''}
                              />
                              <small>Base price × {season.priceMultiplier} = Seasonal price</small>
                            </div>
                            
                            <div className="form-group checkbox-group">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={season.active}
                                  onChange={(e) => handleSeasonalChange(index, 'active', e.target.checked)}
                                  disabled={isViewOnly}
                                  className={isViewOnly ? 'readonly' : ''}
                                />
                                <span>Active</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {seasonalSettings.length === 0 && (
                      <div className="empty-state">
                        No seasonal rates created yet. {!isViewOnly && "Click 'Add Season' to create one."}
                      </div>
                    )}
                  </div>
                  
                  {!isViewOnly && (
                    <div className="settings-actions">
                      <button 
                        className="add-button"
                        onClick={addSeason}
                      >
                        Add Season
                      </button>
                      
                      <button 
                        className="save-button"
                        onClick={() => saveSettings('seasonal')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save Seasonal Rates'}
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="settings-panel">
                  <h2 className="panel-title">General Settings</h2>
                  
                  <div className="settings-form">
                    <div className="section-title">Check-in/Check-out Times</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="defaultCheckInTime">Default Check-in Time</label>
                        <input 
                          type="time" 
                          id="defaultCheckInTime"
                          name="defaultCheckInTime"
                          value={generalSettings.defaultCheckInTime}
                          onChange={handleGeneralChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="defaultCheckOutTime">Default Check-out Time</label>
                        <input 
                          type="time" 
                          id="defaultCheckOutTime"
                          name="defaultCheckOutTime"
                          value={generalSettings.defaultCheckOutTime}
                          onChange={handleGeneralChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="section-title">Fees</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="lateCheckoutFee">Late Check-out Fee</label>
                        <input 
                          type="number" 
                          id="lateCheckoutFee"
                          name="lateCheckoutFee"
                          min="0"
                          step="0.01"
                          value={generalSettings.lateCheckoutFee}
                          onChange={handleGeneralChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="section-title">Booking & Cancellation</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="requireDepositPercentage">Required Deposit (%)</label>
                        <input 
                          type="number" 
                          id="requireDepositPercentage"
                          name="requireDepositPercentage"
                          min="0"
                          max="100"
                          step="0.01"
                          value={generalSettings.requireDepositPercentage}
                          onChange={handleGeneralChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="cancellationFee">Cancellation Fee (%)</label>
                        <input 
                          type="number" 
                          id="cancellationFee"
                          name="cancellationFee"
                          min="0"
                          max="100"
                          step="0.01"
                          value={generalSettings.cancellationFee}
                          onChange={handleGeneralChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="freeCancellationHours">Free Cancellation Hours</label>
                        <input 
                          type="number" 
                          id="freeCancellationHours"
                          name="freeCancellationHours"
                          min="0"
                          step="1"
                          value={generalSettings.freeCancellationHours}
                          onChange={handleGeneralChange}
                          readOnly={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        />
                        <small>Hours before check-in when cancellation is free</small>
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="currency">Currency</label>
                        <select
                          id="currency"
                          name="currency"
                          value={generalSettings.currency}
                          onChange={handleGeneralChange}
                          disabled={isViewOnly}
                          className={isViewOnly ? 'readonly' : ''}
                        >
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="CAD">CAD - Canadian Dollar</option>
                          <option value="AUD">AUD - Australian Dollar</option>
                          <option value="GHS">GHS - Ghanaian Cedi</option>
                          <option value="NGN">NGN - Nigerian Naira</option>
                          <option value="KES">KES - Kenyan Shilling</option>
                          <option value="ZAR">ZAR - South African Rand</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {!isViewOnly && (
                    <div className="settings-actions">
                      <button 
                        className="save-button"
                        onClick={() => saveSettings('general')}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save General Settings'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;