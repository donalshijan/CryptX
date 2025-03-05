import  { useEffect, useRef, useState } from 'react';
import TradeModal from '../components/TradeModal';
import '../styles/MarketsPageLayoutStyles.css';
import axios from 'axios';
const Markets = () => {
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState({ id: 1, name: 'Bitcoin', symbol: 'BTC'});

  const marketsData = [
    { id: 1, name: 'Bitcoin', symbol: 'BTC' },
    { id: 2, name: 'Ethereum', symbol: 'ETH'},
    { id: 3, name: 'Litecoin', symbol: 'LTC'},
    // Add more markets here...
  ];

  const buttonRef = useRef(null);

  useEffect(() => {
    // Set focus on the button when the component mounts
      buttonRef.current.focus();
  }, [0]);

  const handleOpenModal = (e,market) => {
    setSelectedMarket(market);
    setIsModalOpen(true);
    const previousRowSelected = document.querySelector('.selectedRow');
    if (previousRowSelected) {
      previousRowSelected.classList.remove('selectedRow');
    }
      const clickedRow = e.currentTarget.closest('tr');
      if (clickedRow) {
        clickedRow.classList.add('selectedRow');
      }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const placeOrder = async (order) => {
    try {
      const token = localStorage.getItem('jwtToken');
      console.log('Order:', order);
      const response = await axios.post(
        'http://localhost:8080/createorder',
        order,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(response.data); // Assuming the server returns a success message
    } catch (error) {
      console.error('Error placing order:', error);
      alert('An error occurred while placing the order');
    }
  };
  return (
    <div className='MarketsLayoutDiv'>
      <div>
      <h2>Available Crypto/USD Markets</h2>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {marketsData.map((market) => (
            <tr key={market.id} className={market.symbol === 'BTC' ? 'selectedRow' : ''}>
              <td>{market.symbol}</td>
              <td>{market.name}</td>
              <td>
              {market.symbol === 'BTC' ? (<button ref={buttonRef}  onClick={(e) => handleOpenModal(e, market)}onFocus={() => {}}>Trade</button>
        ) : (
          <button onClick={(e) => handleOpenModal(e, market)}>Trade</button>
        )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {isModalOpen && (<div className='tradeModalDiv'>
        <TradeModal
          market={selectedMarket}
          onClose={handleCloseModal}
          onPlaceOrder={placeOrder}
          // Add more props if needed
        />
      </div>
      )}
    </div>
  );
};

export default Markets;
