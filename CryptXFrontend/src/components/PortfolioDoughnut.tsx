import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useEffect, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function PortfolioDoughnut() {
  const [walletData, setWalletData] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('jwtToken'); // Fetch the token from local storage
    const config = {
      headers: {
        Authorization: `Bearer ${token}` 
      }
    };

    axios.get('http://localhost:3000/getUserFiatWalletAndCryptoWalletInfo', config)
      .then(response => {
        console.log('response', response.data);
        setWalletData(response.data);
      })
      .catch(error => {
        console.error('Error fetching wallet data:', error);
      });

    // Connect to the WebSocket server
    const ws = new WebSocket(`ws://localhost:3001?token=${token}`, 'wallet');
    ws.onopen = () => {
      console.log('WebSocket connection opened.');
    };

    ws.onerror = error => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = event => {
      console.log('WebSocket connection closed:', event);
    };

    // Handle messages from the WebSocket server
    ws.onmessage = event => {
      console.log('message was received');
      if (event.data === 'seems like no change so far') {
        console.log(event.data);
      } else {
        const data = JSON.parse(event.data);
        console.log(data);
        // Update walletData with real-time updates
        setWalletData(data);
      }
    };

    return () => {
      // Close the WebSocket connection when the component unmounts
      ws.close();
    };
  }, []);

  const actualValues = [];
  const normalizedValues = [];
  const labels = [];
  const backgroundColors = [];
  const borderColors = [];

  if (walletData) {
    const walletEntries = Object.entries(walletData).filter(([key, value]) => value > 0);

    if (walletEntries.length > 0) {
      // Apply logarithmic normalization
      const logValues = walletEntries.map(([key, value]) => Math.log(value + 1));
      const sumLogValues = logValues.reduce((sum, value) => sum + value, 0);
      const normalizedVals = logValues.map(value => (value / sumLogValues) * 100);

      walletEntries.forEach(([key, value], index) => {
        labels.push(key);
        actualValues.push(value);
        normalizedValues.push(normalizedVals[index]);

        switch (key) {
          case 'fiatWallet':
            backgroundColors.push('rgba(255, 99, 132, 0.2)');
            borderColors.push('rgba(255, 99, 132, 1)');
            break;
          case 'BTC':
            backgroundColors.push('rgba(54, 162, 235, 0.2)');
            borderColors.push('rgba(54, 162, 235, 1)');
            break;
          case 'ETH':
            backgroundColors.push('rgba(255, 206, 86, 0.2)');
            borderColors.push('rgba(255, 206, 86, 1)');
            break;
          case 'LTC':
            backgroundColors.push('rgba(75, 192, 192, 0.2)');
            borderColors.push('rgba(75, 192, 192, 1)');
            break;
          default:
            backgroundColors.push('rgba(153, 102, 255, 0.2)');
            borderColors.push('rgba(153, 102, 255, 1)');
            break;
        }
      });
    }
  }

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Wallet Distribution',
        data: normalizedValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
      },
    ],
  };

  const options = {
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const index = context.dataIndex;
            return ` ${actualValues[index]}`;
          }
        }
      }
    }
  };

  if (!walletData) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <div>
        <h3>Wallet Distribution</h3>
        <div id='doughnutDiv'>
          <Doughnut data={data} options={options} />
        </div>
      </div>
    </>
  );
}

export default PortfolioDoughnut;
