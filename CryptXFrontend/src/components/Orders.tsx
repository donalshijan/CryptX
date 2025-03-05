import axios from 'axios';
import React, { useEffect, useState } from 'react';

const Orders = () => {
  const [ordersData, setOrdersData] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    const ws = new WebSocket(`ws://localhost:3001?token=${token}`, 'order');

    ws.onopen = () => {
      console.log('WebSocket connection opened.');
    };

    ws.onerror = error => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = event => {
      console.log('WebSocket connection closed:', event);
    };

    ws.onmessage = event => {
      console.log('message was received');
      if (event.data === 'seems like no change in orders so far') {
        console.log(event.data);
      } else {
        const data = JSON.parse(event.data);
        console.log(data);
        
        // Combine and sort orders by date
        const combinedOrders = [...data.activeOrders, ...data.fulfilledOrders].sort((a, b) => {
          const dateA = new Date(a.createdDate || a.fulfillmentDate);
          const dateB = new Date(b.createdDate || b.fulfillmentDate);
          return dateB - dateA;
        });

        setOrdersData(combinedOrders);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    const h3Element = document.querySelector('.orderComponentDiv h3');
    const theadElement = document.getElementById('orderThead');
    if (h3Element && theadElement) {
      const h3Height = h3Element.getBoundingClientRect().height;
      theadElement.style.top = `${h3Height}px`;
    }
  }, []);

  return (
    <div className='orderComponentDiv'>
      <h3>Orders</h3>
      <div>
        <table border="1" cellPadding="5" cellSpacing="0" >
          <thead id='orderThead'>
            <tr>
              <th>Status</th>
              <th>Order ID</th>
              <th>Order Type</th>
              <th>Crypto</th>
              <th>Amount</th>
              <th>Order Price</th>
            </tr>
          </thead>
          <tbody>
            {ordersData.map(order => (
              <tr key={order.orderID}>
                <td style={{ color: order.fulfillmentDate ? 'green' : 'red' }}>
                  {order.fulfillmentDate ? 'Fulfilled' : 'Active'}
                </td>
                <td>{order.orderID}</td>
                <td>{order.orderType}</td>
                <td>{order.orderCrypto}</td>
                <td>{order.amount}</td>
                <td>{order.orderPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;
