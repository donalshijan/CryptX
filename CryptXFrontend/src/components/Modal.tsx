import axios from 'axios';
import '../styles/modal.css'; // Add styles for your modal

const Modal = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close-button" onClick={onClose}>
          &times;
        </span>
        <form className='formElement'
            onSubmit={async (e) => {
              e.preventDefault();
              // Handle form submission to the server
              const formData = new FormData(e.target);
              try {
                const token = localStorage.getItem('jwtToken');
                await axios.post('http://localhost:3000/verifyUserDetails', formData, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                  },
                });
                onClose();
                // Fetch the updated verification status if needed
              } catch (error) {
                console.error('Error submitting verification:', error);
              }
            }}
          >
            <div className='formDiv'>
              <label>
                First Name:
                </label>
                <input type="text" name="firstName" required />
              
            </div>
            <div className='formDiv'>
              <label>
                Last Name:
                
              </label>
              <input type="text" name="lastName" required />
            </div>
            <div className='formDiv'>
              <label>
                Address:
                
              </label>
              <input type="text" name="address" required />
            </div>
            <div className='formDiv'>
              <label>
                ID Photo:
                
              </label>
              <input type="file" name="idPhoto" accept="image/*" required />
            </div>
            <button type="submit" className="modalSubmit">Submit</button>
          </form>
      </div>
    </div>
  );
};

export default Modal;