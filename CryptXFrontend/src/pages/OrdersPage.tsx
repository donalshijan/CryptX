import  { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/OrdersPage.css';

function OrdersPage() {
  const [orders, setOrders] = useState({ activeOrders: [], fulfilledOrders: [] });
  const [showActiveOrders, setShowActiveOrders] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('jwtToken');
      const response = await axios.get('http://localhost:8080/fetchActiveAndFulfilledOrders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log(response.data)
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      // Handle error appropriately (e.g., show an error message)
    }
  };

  const toggleOrders = (event) => {
    const clickedButtonInnerText = event.target.innerText.trim();
    const selectedElement = document.querySelector('.selected');
    if (selectedElement && clickedButtonInnerText === selectedElement.innerText.trim()) {
      return;
    }
    if (selectedElement) {
      selectedElement.classList.remove('selected');
    }
    event.target.classList.add('selected');
    setShowActiveOrders(clickedButtonInnerText === 'Active');
  };

  const ordersToShow = showActiveOrders ? orders.activeOrders : orders.fulfilledOrders;
  console.log(ordersToShow)
  return (
    <div className='ordersLayoutDiv'>
      <div className="toggle-switch-container">
        <div className="toggle-switch ">
          <button onClick={(event) => toggleOrders(event)} className="selected">
            Active
          </button>
          <button onClick={(event) => toggleOrders(event)} >
            Fulfilled
          </button>
          {/* <div className={`slider ${showActiveOrders ? 'active' : 'previous'}`} /> */}
        </div>
        <h2>{showActiveOrders ? 'Active Orders' : 'Fulfilled Orders'}</h2>
        <table>
            <thead>
              <th>
                Crypto
              </th>
              <th>
                Type
              </th>
              <th>
                Price
              </th>
              <th>
                Amount
              </th>
            </thead>
          </table>
        <div className="ordersList">
        {ordersToShow && ordersToShow.map((order) => (
          <div className='orderItem' key={order.orderID}>
            <p> {order.orderCrypto}</p>
            <p> {order.orderType}</p>
            <p> {order.orderPrice}</p>
            <p> {order.amount}</p>
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}

export default OrdersPage;
