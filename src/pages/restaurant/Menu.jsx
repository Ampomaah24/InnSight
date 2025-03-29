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
import "./Menu.css";
import NoImage from "../../assets/images/pixelcut-export.jpeg";

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
      console.log(`${meal.name} added to cart`);
    } catch (err) {
      console.error("Error adding to cart", err);
    }
  };

  const goToCart = () => {
    navigate("/restaurant/cart");
  };

  const activeItems = meals.filter((meal) => meal.category === activeTab);

  return (
    <div className="menu-page">
      {/* Floating cart icon */}
      <div className="floating-cart" onClick={goToCart} title="Go to Cart">
        🛒
        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </div>

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
          Food
        </span>
        <span
          className={activeTab === "drink" ? "active" : ""}
          onClick={() => setActiveTab("drink")}
        >
          Drinks
        </span>
      </div>

      <div className="menu-section">
        <h2>{activeTab === "food" ? "🍽️ Food" : "🥤 Drinks"}</h2>
        {loading ? (
          <p className="loading-text">Loading meals...</p>
        ) : activeItems.length > 0 ? (
          <div className="menu-grid">
            {activeItems.map((meal) => (
              <div className="menu-card" key={meal.id}>
                <img src={meal.imageUrl || NoImage} alt={meal.name} />
                <div className="menu-card-content">
                  <h3>{meal.name}</h3>
                  <p>GHS {meal.price}</p>
                  <button onClick={() => addToCart(meal)}>Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="loading-text">No meals found.</p>
        )}
      </div>
    </div>
  );
};

export default Menu;
