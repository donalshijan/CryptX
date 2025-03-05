import axios from "axios";
import { useEffect, useState } from "react";

const WalletPage = () => {
  const [walletInfo, setWalletInfo] = useState({}) 
  useEffect(() => {
    fetchWalletInfo()
  },[])
  const fetchWalletInfo = async () => {
    try {
      const response = await axios.get('http://localhost:3000/getUserFiatWalletAndCryptoWalletInfo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('jwtToken')}`,
        },
      });
      console.log('hi')
      console.log(response)
      setWalletInfo(response.data);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };
  const handleDeposit = (asset) => {
    // Implement your sell logic here
    console.log(`Selling ${asset.name} (${asset.symbol}) - Quantity: ${asset.quantity}`);
  };
  
  const handleWithdraw = (asset) => {
    // Implement your transfer logic here
    console.log(`Transferring ${asset.name} (${asset.symbol}) - Quantity: ${asset.quantity}`);
  };
  console.log(walletInfo)
  return (
    <div>
      <h2>My Crypto Wallet</h2>
      <table>
        <thead>
          <tr>
            <th>WalletType</th>
            <th>Balance</th>
            <th>Deposit</th>
            <th>Withdraw</th>
          </tr>
        </thead>
        <tbody>
        {walletInfo && Object.entries(walletInfo).map(([fieldName, value]) => (
            <tr key={fieldName}>
              <td>{fieldName}</td>
              <td>{value}</td>
              <td>
                <button onClick={() => handleDeposit({ name: fieldName, symbol: fieldName, quantity: value })}>
                  Deposit
                </button>
              </td>
              <td>
                  <button onClick={() => handleWithdraw({ name: fieldName, symbol: fieldName, quantity: value })}>
                    Withdraw
                  </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default WalletPage

