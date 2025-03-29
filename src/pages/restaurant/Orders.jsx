// OrderStatusPage.jsx
import { useEffect, useState } from 'react';
import { db } from "../../config/firebase";


import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export default function OrderStatusPage() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetch();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
      {orders.map(order => (
        <div key={order.id} className="border p-4 rounded-md mb-4">
          <div className="font-semibold">Order for: {order.userType === 'guest' ? `Room ${order.roomNumber}` : order.name}</div>
          <ul className="list-disc ml-4">
            {order.items.map((item, idx) => (
              <li key={idx}>{item.name} - GHS {item.price}</li>
            ))}
          </ul>
          <div className="mt-2 font-bold">Total: GHS {order.total}</div>
          <div>Status: <span className="italic">{order.status}</span></div>
        </div>
      ))}
    </div>
  );
}
