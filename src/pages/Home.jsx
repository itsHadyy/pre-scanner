import { useNavigate } from 'react-router-dom';
import UnitInput from '../components/UnitInput';
import '../styles/home.css';
import { validateAndClaimUnit } from '../services/unitService';

function Home() {
  const navigate = useNavigate();

  const handleSuccess = async (unitNumber) => {
    const result = await validateAndClaimUnit(unitNumber);
    try {
      const key = `qrCodes_${result.unitNumber}`;
      localStorage.setItem(key, JSON.stringify(result.qrCodes));
    } catch (e) {
      // ignore cache failures
    }
    navigate(`/claim?unit=${encodeURIComponent(result.unitNumber)}`);
  };

  return (
    <div className="page page-home">
      <span className="floating-chip chip-1">Exclusive resident offer</span>
      <span className="floating-chip chip-2">Four complimentary drinks</span>
      <div className="home-logo-hero">
        <img src="/logo.png" alt="PRE Group" className="home-logo-hero-image" />
        <span className="home-logo-glow" />
      </div>
      <div className="card home-card">
        <h1 className="home-title">Claim Your Free Drinks</h1>
        <p className="home-subtitle">
          Enter your unit number to receive four drink vouchers.
        </p>
        <UnitInput onSuccess={handleSuccess} />
      </div>
    </div>
  );
}

export default Home;

