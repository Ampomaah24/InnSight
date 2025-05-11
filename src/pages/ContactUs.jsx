import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import emailjs from '@emailjs/browser';
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

  // Ghanaian phone number validation
  const isValidGhanaianPhoneNumber = (phone) => {
    // Remove any spaces or dashes
    const cleanedPhone = phone.replace(/[\s\-]/g, '');
    
    // Ghanaian phone number patterns
    // Local format: 024XXXXXXX, 055XXXXXXX, etc.
    const localPattern = /^(024|025|026|027|028|029|030|050|054|055|056|057|059)[0-9]{7}$/;
    // International format: +233XXXXXXXXX
    const internationalPattern = /^\+233(24|25|26|27|28|29|30|50|54|55|56|57|59)[0-9]{7}$/;
    
    return localPattern.test(cleanedPhone) || internationalPattern.test(cleanedPhone);
  };

  // Email validation
  const isValidEmail = (email) => {
    // More comprehensive email validation regex
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  // Format phone number before saving
  const formatPhoneNumber = (phone) => {
    let formattedPhone = phone.trim();
    if (formattedPhone && !formattedPhone.startsWith('+')) {
      // Convert local format to international format for storage
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+233' + formattedPhone.substring(1);
      }
    }
    return formattedPhone;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for phone number - only allow numbers and certain characters
    if (name === 'phone') {
      // Allow only numbers, +, spaces, and dashes
      const cleanedValue = value.replace(/[^\d\s\-+]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanedValue }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    let errors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }
    
    // Phone validation (optional field, but validate if provided)
    if (formData.phone.trim()) {
      if (!isValidGhanaianPhoneNumber(formData.phone)) {
        errors.phone = "Please enter a valid Ghanaian phone number (e.g., 024XXXXXXX or +233XXXXXXXXX)";
      }
    }
    
    // Subject validation
    if (!formData.subject.trim()) {
      errors.subject = "Subject is required";
    } else if (formData.subject.trim().length < 3) {
      errors.subject = "Subject must be at least 3 characters";
    }
    
    // Message validation
    if (!formData.message.trim()) {
      errors.message = "Message is required";
    } else if (formData.message.trim().length < 10) {
      errors.message = "Message must be at least 10 characters";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError("");
    
    try {
      // Format phone number for storage (if provided)
      let formattedPhone = formatPhoneNumber(formData.phone);
      
      // 1. Add the message to Firestore with formatted phone
      const docRef = await addDoc(collection(db, "contactMessages"), {
        ...formData,
        phone: formattedPhone || "Not provided",
        status: "New",
        createdAt: serverTimestamp(),
      });
      
      // 2. Prepare data for EmailJS
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        from_phone: formattedPhone || "Not provided",
        subject: formData.subject,
        message: formData.message,
        reply_to: formData.email,
        reference_id: docRef.id
      };
      
      // 3. Send email using EmailJS
      const response = await emailjs.send(
        'service_pgx5uqi', // Your EmailJS service ID
        'template_hj63f35', // Your EmailJS template ID
        templateParams,
        'OQbDGwLva7RM5VxU5' // Your EmailJS public key
      );
      
      if (response.status !== 200) {
        throw new Error("Email service failed to send the notification");
      }
      
      // 4. Update Firestore document to mark email as sent
      await updateDoc(doc(db, "contactMessages", docRef.id), {
        emailSent: true,
        emailSentAt: serverTimestamp()
      });
      
      // 5. Show success message
      setSubmitSuccess(true);
      
      // 6. Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      
      // 7. Hide success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 5000);
      
    } catch (error) {
      console.error("Error submitting contact form:", error);
      
      // More specific error messages based on error type
      if (error.code && error.code.includes("permission-denied")) {
        setSubmitError("Sorry, we're experiencing permission issues with our database. Our team has been notified.");
      } else if (error.message && error.message.includes("email")) {
        setSubmitError("There was an error sending the notification email. Please try again later.");
      } else {
        setSubmitError("There was an error submitting your message. Please try again later.");
      }
      
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
                <p>juniorantwi95@gmail.com</p>
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
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={formErrors.name ? "error" : ""}
                placeholder="Enter your full name"
              />
              {formErrors.name && <small className="error-text">{formErrors.name}</small>}
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={formErrors.email ? "error" : ""}
                placeholder="Enter your email address"
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
                className={formErrors.phone ? "error" : ""}
                placeholder="e.g., 024XXXXXXX or +233XXXXXXXXX"
              />
              {formErrors.phone && <small className="error-text">{formErrors.phone}</small>}
            </div>
            
            <div className="form-group">
              <label htmlFor="subject">Subject *</label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                className={formErrors.subject ? "error" : ""}
                placeholder="What is this regarding?"
              />
              {formErrors.subject && <small className="error-text">{formErrors.subject}</small>}
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={formData.message}
                onChange={handleChange}
                className={formErrors.message ? "error" : ""}
                placeholder="Enter your message here..."
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
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3970.4999696256787!2d-0.14757002406741038!3d5.640550594340682!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xfdf84aea294a0b9%3A0x6b7445b9a4c59f14!2sAmpomaah%20Tourist%20Hotel!5e0!3m2!1sen!2sgh!4v1743924434929!5m2!1sen!2sgh"
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