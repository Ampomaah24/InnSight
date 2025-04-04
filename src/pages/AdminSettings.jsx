import React, { useState, useEffect } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import Sidebar from '../components/Sidebar';
import '../assets/styles/AdminSettings.css';

const AdminSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('taxes');
  const [notification, setNotification] = useState(null);
  
  // Settings state objects
  const [taxSettings, setTaxSettings] = useState({
    roomTaxRate: 10,
    serviceTaxRate: 5,
    cityTaxRate: 2,
    taxIncluded: false
  });
  
  const [discountSettings, setDiscountSettings] = useState({
    seniorDiscount: 10,
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
    earlyCheckInFee: 50,
    allowEarlyCheckIn: true,
    allowLateCheckout: true,
    requireDepositPercentage: 25,
    cancellationFee: 20,
    freeCancellationHours: 48,
    currency: 'USD'
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        // Fetch tax settings
        const taxDoc = await getDoc(doc(db, 'settings', 'taxes'));
        if (taxDoc.exists()) {
          setTaxSettings(taxDoc.data());
        }
        
        // Fetch discount settings
        const discountDoc = await getDoc(doc(db, 'settings', 'discounts'));
        if (discountDoc.exists()) {
          setDiscountSettings(discountDoc.data());
        }
        
        // Fetch promotions
        const promotionDoc = await getDoc(doc(db, 'settings', 'promotions'));
        if (promotionDoc.exists() && promotionDoc.data().items) {
          // Convert Firestore timestamps to JS dates
          const promotions = promotionDoc.data().items.map(promo => ({
            ...promo,
            startDate: promo.startDate instanceof Timestamp ? 
              promo.startDate.toDate() : new Date(promo.startDate),
            endDate: promo.endDate instanceof Timestamp ? 
              promo.endDate.toDate() : new Date(promo.endDate)
          }));
          setPromotionSettings(promotions);
        }
        
        // Fetch seasonal pricing
        const seasonalDoc = await getDoc(doc(db, 'settings', 'seasonal'));
        if (seasonalDoc.exists() && seasonalDoc.data().items) {
          // Convert Firestore timestamps to JS dates
          const seasons = seasonalDoc.data().items.map(season => ({
            ...season,
            startDate: season.startDate instanceof Timestamp ? 
              season.startDate.toDate() : new Date(season.startDate),
            endDate: season.endDate instanceof Timestamp ? 
              season.endDate.toDate() : new Date(season.endDate)
          }));
          setSeasonalSettings(seasons);
        }
        
        // Fetch general settings
        const generalDoc = await getDoc(doc(db, 'settings', 'general'));
        if (generalDoc.exists()) {
          setGeneralSettings(generalDoc.data());
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching settings:', error);
        showNotification('Error loading settings from database', 'error');
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async (settingType) => {
    try {
      setSaving(true);
      
      switch (settingType) {
        case 'taxes':
          await setDoc(doc(db, 'settings', 'taxes'), {
            ...taxSettings,
            lastUpdated: Timestamp.now()
          });
          break;
        
        case 'discounts':
          await setDoc(doc(db, 'settings', 'discounts'), {
            ...discountSettings,
            lastUpdated: Timestamp.now()
          });
          break;
        
        case 'promotions':
          // Convert JS dates to Firestore timestamps for promotions
          const promotionsForFirestore = {
            items: promotionSettings.map(promo => ({
              ...promo,
              startDate: Timestamp.fromDate(new Date(promo.startDate)),
              endDate: Timestamp.fromDate(new Date(promo.endDate))
            })),
            lastUpdated: Timestamp.now()
          };
          
          await setDoc(doc(db, 'settings', 'promotions'), promotionsForFirestore);
          break;
        
        case 'seasonal':
          // Convert JS dates to Firestore timestamps for seasonal pricing
          const seasonsForFirestore = {
            items: seasonalSettings.map(season => ({
              ...season,
              startDate: Timestamp.fromDate(new Date(season.startDate)),
              endDate: Timestamp.fromDate(new Date(season.endDate))
            })),
            lastUpdated: Timestamp.now()
          };
          
          await setDoc(doc(db, 'settings', 'seasonal'), seasonsForFirestore);
          break;
          
        case 'general':
          await setDoc(doc(db, 'settings', 'general'), {
            ...generalSettings,
            lastUpdated: Timestamp.now()
          });
          break;
          
        default:
          throw new Error('Unknown settings type');
      }
      
      showNotification(`${settingType.charAt(0).toUpperCase() + settingType.slice(1)} settings saved successfully!`);
      setSaving(false);
    } catch (error) {
      console.error(`Error saving ${settingType} settings:`, error);
      showNotification(`Error saving ${settingType} settings: ${error.message}`, 'error');
      setSaving(false);
    }
  };
  
  // Shows a notification message that disappears after 3 seconds
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };
  
  // Handle tax settings changes
  const handleTaxChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTaxSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
  };
  
  // Handle discount settings changes
  const handleDiscountChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDiscountSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value)
    }));
  };
  
  // Handle general settings changes
  const handleGeneralChange = (e) => {
    const { name, value, type, checked } = e.target;
    setGeneralSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle adding a new promotion
  const addPromotion = () => {
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
  
  // Handle adding a new seasonal rate
  const addSeason = () => {
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
  
  // Handle promotion changes
  const handlePromotionChange = (index, field, value) => {
    const updatedPromotions = [...promotionSettings];
    updatedPromotions[index][field] = value;
    setPromotionSettings(updatedPromotions);
  };
  
  // Handle seasonal rate changes
  const handleSeasonalChange = (index, field, value) => {
    const updatedSeasons = [...seasonalSettings];
    updatedSeasons[index][field] = value;
    setSeasonalSettings(updatedSeasons);
  };
  
  // Handle removing a promotion
  const removePromotion = (index) => {
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      const updatedPromotions = [...promotionSettings];
      updatedPromotions.splice(index, 1);
      setPromotionSettings(updatedPromotions);
    }
  };
  
  // Handle removing a seasonal rate
  const removeSeason = (index) => {
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
                        <label htmlFor="roomTaxRate">Room Tax Rate (%)</label>
                        <input 
                          type="number" 
                          id="roomTaxRate"
                          name="roomTaxRate"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxSettings.roomTaxRate}
                          onChange={handleTaxChange}
                        />
                      </div>
                      
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
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
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
                        />
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <label htmlFor="taxIncluded">
                          <input 
                            type="checkbox" 
                            id="taxIncluded"
                            name="taxIncluded"
                            checked={taxSettings.taxIncluded}
                            onChange={handleTaxChange}
                          />
                          <span>Rates include taxes</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="settings-actions">
                    <button 
                      className="save-button"
                      onClick={() => saveSettings('taxes')}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Tax Settings'}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Discounts Settings */}
              {activeTab === 'discounts' && (
                <div className="settings-panel">
                  <h2 className="panel-title">Discounts</h2>
                  
                  <div className="settings-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="seniorDiscount">Senior Discount (%)</label>
                        <input 
                          type="number" 
                          id="seniorDiscount"
                          name="seniorDiscount"
                          min="0"
                          max="100"
                          step="0.01"
                          value={discountSettings.seniorDiscount}
                          onChange={handleDiscountChange}
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
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="settings-actions">
                    <button 
                      className="save-button"
                      onClick={() => saveSettings('discounts')}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save Discount Settings'}
                    </button>
                  </div>
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
                            className="promotion-name"
                            value={promotion.name}
                            onChange={(e) => handlePromotionChange(index, 'name', e.target.value)}
                          />
                          <button 
                            className="remove-btn"
                            onClick={() => removePromotion(index)}
                          >
                            Remove
                          </button>
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
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>Promotion Code</label>
                              <input
                                type="text"
                                value={promotion.code}
                                onChange={(e) => handlePromotionChange(index, 'code', e.target.value.toUpperCase())}
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
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>End Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(promotion.endDate)}
                                onChange={(e) => handlePromotionChange(index, 'endDate', new Date(e.target.value))}
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
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {promotionSettings.length === 0 && (
                      <div className="empty-state">
                        No promotions created yet. Click 'Add Promotion' to create one.
                      </div>
                    )}
                  </div>
                  
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
                            className="season-name"
                            value={season.name}
                            onChange={(e) => handleSeasonalChange(index, 'name', e.target.value)}
                          />
                          <button 
                            className="remove-btn"
                            onClick={() => removeSeason(index)}
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="season-body">
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(season.startDate)}
                                onChange={(e) => handleSeasonalChange(index, 'startDate', new Date(e.target.value))}
                              />
                            </div>
                            
                            <div className="form-group">
                              <label>End Date</label>
                              <input
                                type="date"
                                value={formatDateForInput(season.endDate)}
                                onChange={(e) => handleSeasonalChange(index, 'endDate', new Date(e.target.value))}
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
                              />
                              <small>Base price × {season.priceMultiplier} = Seasonal price</small>
                            </div>
                            
                            <div className="form-group checkbox-group">
                              <label>
                                <input
                                  type="checkbox"
                                  checked={season.active}
                                  onChange={(e) => handleSeasonalChange(index, 'active', e.target.checked)}
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
                        No seasonal rates created yet. Click 'Add Season' to create one.
                      </div>
                    )}
                  </div>
                  
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
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="earlyCheckInFee">Early Check-in Fee</label>
                        <input 
                          type="number" 
                          id="earlyCheckInFee"
                          name="earlyCheckInFee"
                          min="0"
                          step="0.01"
                          value={generalSettings.earlyCheckInFee}
                          onChange={handleGeneralChange}
                        />
                      </div>
                    </div>
                    
                    <div className="form-row">
                      <div className="form-group checkbox-group">
                        <label htmlFor="allowEarlyCheckIn">
                          <input 
                            type="checkbox" 
                            id="allowEarlyCheckIn"
                            name="allowEarlyCheckIn"
                            checked={generalSettings.allowEarlyCheckIn}
                            onChange={handleGeneralChange}
                          />
                          <span>Allow Early Check-in</span>
                        </label>
                      </div>
                      
                      <div className="form-group checkbox-group">
                        <label htmlFor="allowLateCheckout">
                          <input 
                            type="checkbox" 
                            id="allowLateCheckout"
                            name="allowLateCheckout"
                            checked={generalSettings.allowLateCheckout}
                            onChange={handleGeneralChange}
                          />
                          <span>Allow Late Check-out</span>
                          />
                          <span>Allow Late Check-out</span>
                        </label>
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
                  
                  <div className="settings-actions">
                    <button 
                      className="save-button"
                      onClick={() => saveSettings('general')}
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Save General Settings'}
                    </button>
                  </div>
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