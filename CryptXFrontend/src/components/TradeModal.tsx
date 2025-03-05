import axios from 'axios';
import  { useEffect, useState } from 'react';

const TradeModal = ({ market, onClose, onPlaceOrder }) => {
  const [price, setPrice] = useState('');
  const [amount, setAmount] = useState('');
  const [isBuy, setIsBuy] = useState(true);
  const [orderType,setOrderType] = useState('buy');
  const [error, setError] = useState('');
  const [animateError, setAnimateError] = useState(false);
  useEffect(() => {
    if (animateError) {
      const timer = setTimeout(() => setAnimateError(false), 200); // Reset animation state after animation duration
      return () => clearTimeout(timer);
    }
  }, [animateError]);
  const handlePlaceOrder = async () => {
    // Clear previous error
    setError('');

    // Validate price and amount
    if (!price || price <= 0) {
      setError('Price must be greater than 0');
      setAnimateError(true); // Trigger animation
      return;
    }
    if (!amount || amount <= 0) {
      setError('Amount must be greater than 0');
      setAnimateError(true); // Trigger animation
      return;
    }
    const order = {
      market: market.symbol,
      price: parseFloat(price),
      amount: parseFloat(amount),
      type: isBuy ? 'buy' : 'sell',
    };

    // Fetch user wallet info from the server using the authorization header
    let walletInfo;
    try {
      const response = await axios.get('http://localhost:3000/getUserFiatWalletAndCryptoWalletInfo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('jwtToken')}`,
        },
      });
      walletInfo = response.data;
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      alert('An error occurred while fetching wallet info');
      return; // Stop further execution if there's an error
    }
    try {
      if (isBuy) {
        const totalCost = order.price * order.amount;
        if (totalCost > walletInfo.fiatWallet) {
          alert('Insufficient funds in fiat wallet');
          return;
        }
      } else {
        const cryptoAmount = walletInfo[order.market.symbol];
        if (order.amount > cryptoAmount) {
          alert('Insufficient crypto in wallet');
          return;
        }
      }

      // Proceed with the trading process by calling onPlaceOrder
      onPlaceOrder(order);
    } catch (error) {
      console.error('Error placing order:', error);
      alert('An error occurred while placing the order');
    }
  }

  return (
    <div className="trade-modal">
      <h2>Trade {market.name} ({market.symbol})</h2>
      {error && <div className={` ${animateError ? 'animate-message' : 'error-message'}`}>{error}</div>}
      <div className='trade-input'>
      <label>
        <h4>Price (USD):</h4>
        <input type="number" step="any" value={price} onChange={(e) => setPrice(e.target.value) } />
      </label>
      <label>
        <h4>Amount:</h4>
        <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label>
        <h4>Type:</h4>
        <select value={orderType} id="selectOption" onChange={(e) => {setOrderType(e.target.value);setIsBuy(e.target.value === 'buy')}}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
        </select>
      </label>
      </div>
      <div className="buttons">
        <button onClick={handlePlaceOrder}>Place Order</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
};

export default TradeModal;
