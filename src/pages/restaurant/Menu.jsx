import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from "../../config/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import NavMenu from "../../components/NavMenu"; // Import NavMenu component
import "./Menu.css";
import NoImage from "../../assets/images/pixelcut-export.jpeg";
import { FaShoppingCart, FaUtensils, FaWineGlassAlt } from 'react-icons/fa'; // Import icons

// Helper to get a unique guest ID and persist in localStorage
let persistentUserId;
const getOrCreateUserId = () => {
  if (persistentUserId) return persistentUserId;

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (currentUser) {
    persistentUserId = currentUser.uid;
  } else {
    let guestId = localStorage.getItem("guestId");
    if (!guestId) {
      guestId = `guest_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guestId", guestId);
    }
    persistentUserId = guestId;
  }

  return persistentUserId;
};

const Menu = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("food");
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [addedToCart, setAddedToCart] = useState(null);
  const navigate = useNavigate();

  const userId = getOrCreateUserId();

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "meals"));
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMeals(data);
      } catch (error) {
        console.error("Error fetching meals:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCartCount = async () => {
      try {
        const snapshot = await getDocs(collection(db, "carts", userId, "items"));
        const total = snapshot.docs.reduce((sum, doc) => sum + doc.data().quantity, 0);
        setCartCount(total);
      } catch (error) {
        console.error("Error fetching cart count:", error);
      }
    };

    window.scrollTo(0, 0);
    fetchMeals();
    fetchCartCount();
  }, [userId]);

  const addToCart = async (meal) => {
    try {
      const itemRef = doc(db, "carts", userId, "items", meal.id);
      const itemSnap = await getDoc(itemRef);

      if (itemSnap.exists()) {
        await updateDoc(itemRef, {
          quantity: increment(1),
        });
      } else {
        await setDoc(itemRef, {
          userId,
          name: meal.name,
          price: meal.price,
          quantity: 1,
          imageUrl: meal.imageUrl || "",
          category: meal.category,
        });
      }

      setCartCount((prev) => prev + 1);
      
      // Show added to cart notification
      setAddedToCart(meal.name);
      setTimeout(() => setAddedToCart(null), 2000);
      
    } catch (err) {
      console.error("Error adding to cart", err);
    }
  };

  const goToCart = () => {
    navigate("/restaurant/cart");
  };

  const activeItems = meals.filter((meal) => meal.category === activeTab);

  return (
    <div className="main-container">
      {/* NavMenu in top left */}
      <div className="nav-container" style={{ backgroundColor: "transparent", boxShadow: "none" }}>
        <NavMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      </div>

      <div className="menu-page">
        {/* Floating cart icon */}
        <div className="floating-cart" onClick={goToCart} title="Go to Cart">
          <FaShoppingCart />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>

        {/* Added to cart notification */}
        {addedToCart && (
          <div className="add-to-cart-notification">
            <FaShoppingCart /> {addedToCart} added to cart!
          </div>
        )}

        <div className="menu-banner">
          <div className="menu-banner-text">
            <h1>Order your favorite meals from us now</h1>
          </div>
        </div>

        <div className="menu-tabs">
          <span
            className={activeTab === "food" ? "active" : ""}
            onClick={() => setActiveTab("food")}
          >
            <FaUtensils style={{ marginRight: '0.5rem' }} /> Food
          </span>
          <span
            className={activeTab === "drink" ? "active" : ""}
            onClick={() => setActiveTab("drink")}
          >
            <FaWineGlassAlt style={{ marginRight: '0.5rem' }} /> Drinks
          </span>
        </div>

        <div className="menu-section">
          <h2>{activeTab === "food" ? "🍽️ Food Menu" : "🥤 Drinks Menu"}</h2>
          {loading ? (
            <div className="loading-container">
              <div className="spinner"></div>
              <p className="loading-text">Loading meals...</p>
            </div>
          ) : activeItems.length > 0 ? (
            <div className="menu-grid">
              {activeItems.map((meal) => (
                <div className="menu-card" key={meal.id}>
                  <img src={meal.imageUrl || NoImage} alt={meal.name} />
                  <div className="menu-card-content">
                    <h3>{meal.name}</h3>
                    <p>GHS {meal.price.toFixed(2)}</p>
                    <button onClick={() => addToCart(meal)}>
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="loading-text">No {activeTab === "food" ? "food" : "drinks"} items found. Please check back later!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Menu;