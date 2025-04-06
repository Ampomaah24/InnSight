import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import NavMenu from "../components/NavMenu";
import "../assets/styles/ContactUs.css";

const ContactUs = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    // Fix scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  const validateForm = () => {
    let errors = {};
    
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    }
    
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email address is invalid";
    }
    
    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    }
    
    if (!formData.message.trim()) {
      errors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Add the message to Firestore
      await addDoc(collection(db, "contactMessages"), {
        ...formData,
        status: "New",
        createdAt: serverTimestamp(),
      });
      
      // Show success message
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error("Error submitting contact form:", error);
      setSubmitError("There was an error submitting your message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      {/* NavMenu in top left */}
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>
      
      <div className="back-button-container">
      {/*   <button
          type="button"
          className="back-button"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button> */}
      </div>

      <div className="contact-container">
        <div className="contact-info">
          <h2>Get In Touch</h2>
          <p>We'd love to hear from you. Please fill out the form and we'll get back to you as soon as possible.</p>
          
          <div className="contact-details">
            <div className="contact-item">
              <div className="contact-icon">📍</div>
              <div className="contact-text">
                <h3>Address</h3>
                <p>33 Boundary Road, Accra</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">📞</div>
              <div className="contact-text">
                <h3>Phone</h3>
                <p>+233 20 123 4567</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">✉️</div>
              <div className="contact-text">
                <h3>Email</h3>
                <p>info@yourhotelemailaddress.com</p>
              </div>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">🕒</div>
              <div className="contact-text">
                <h3>Reception Hours</h3>
                <p>24/7, All days</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="contact-form-container">
          <h2>Contact Form</h2>
          
          {submitSuccess && (
            <div className="success-message">
              Your message has been sent successfully! We'll be in touch soon.
            </div>
          )}
          
          {submitError && (
            <div className="error-message">
              {submitError}
            </div>
          )}
          
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={formErrors.name ? "error" : ""}
              />
              {formErrors.name && <small className="error-text">{formErrors.name}</small>}
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={formErrors.email ? "error" : ""}
              />
              {formErrors.email && <small className="error-text">{formErrors.email}</small>}
            </div>
            
            <div className="form-group">
              <label htmlFor="phone">Phone (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={formErrors.subject ? "error" : ""}
              />
              {formErrors.subject && <small className="error-text">{formErrors.subject}</small>}
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                className={formErrors.message ? "error" : ""}
              ></textarea>
              {formErrors.message && <small className="error-text">{formErrors.message}</small>}
            </div>
            
            <button 
              type="submit" 
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
      
      {/* Map Section */}
      <div className="map-container">
        <h2>Find Us</h2>
        <div className="map-wrapper">
      
<iframe
  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.4999696256787!2d-0.14757002406741038!3d5.640550394340682!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf84aea294a0b9%3A0x6b7445b9a4c59f14!2sAmpomaah%20Tourist%20Hotel!5e0!3m2!1sen!2sgh!4v1743924434929!5m2!1sen!2sgh"
  width="100%"
  height="450"
  style={{ border: 0 }}
  allowFullScreen=""
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
  title="Hotel Location"
></iframe>
        </div>
      </div>

      <div className="map-actions">
  <a 
    href={`https://maps.app.goo.gl/TQzqwQv3tusbQG3B9`} 
    target="_blank" 
    rel="noopener noreferrer"
    className="directions-link"
  >
    Get Directions →
  </a>
</div>
    </div>
  );
};

export default ContactUs;