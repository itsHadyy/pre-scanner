import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCodeCard from '../components/QRCodeCard';
import DrinkCounter from '../components/DrinkCounter';
import '../styles/claim.css';
import { subscribeToUnitQrCodes } from '../services/qrService';
import { fetchUnitQrCodes } from '../services/unitService';

const TOTAL_DRINKS = 4;
const REDEEM_BASE_URL = 'https://yourdomain.com/redeem';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function Claim() {
  const navigate = useNavigate();
  const query = useQuery();
  const unitNumber = query.get('unit');
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!unitNumber) {
      navigate('/');
      return;
    }

    // Load from local storage first so vouchers are not lost on refresh
    try {
      const cached = localStorage.getItem(`qrCodes_${unitNumber}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length) {
          setQrCodes(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      // ignore cache failures
    }

    let unsubscribe;

    const init = async () => {
      try {
        const existing = await fetchUnitQrCodes(unitNumber);
        setQrCodes(existing);
        try {
          localStorage.setItem(`qrCodes_${unitNumber}`, JSON.stringify(existing));
        } catch (e) {
          // ignore cache failures
        }
      } catch (e) {
        // ignore; listener will handle
      } finally {
        setLoading(false);
      }

      unsubscribe = subscribeToUnitQrCodes(unitNumber, (codes) => {
        setQrCodes(codes);
        try {
          localStorage.setItem(`qrCodes_${unitNumber}`, JSON.stringify(codes));
        } catch (e) {
          // ignore cache failures
        }
      });
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [unitNumber, navigate]);

  const redeemedCount = qrCodes.filter((c) => c.uses >= c.maxUses).length;

  return (
    <div className="page page-claim">
      <span className="floating-chip chip-1">Unit {unitNumber}</span>
      <span className="floating-chip chip-2">
        {redeemedCount}
        {' '}
        of
        {' '}
        {TOTAL_DRINKS}
        {' '}
        redeemed
      </span>
      <div className="card claim-card">
        <h1 className="claim-title">Your Drink Vouchers</h1>
        <p className="claim-subtitle">
          Show these QR codes to staff to redeem your free drinks.
        </p>

        <DrinkCounter redeemed={redeemedCount} total={TOTAL_DRINKS} />

        {loading && (
          <div className="loading-row">
            <span className="loader" />
            <span className="loading-text">Loading your vouchers...</span>
          </div>
        )}

        <div className="qr-grid">
          {qrCodes.slice(0, TOTAL_DRINKS).map((code, index) => (
            <QRCodeCard
              key={code.id}
              index={index}
              token={code.token}
              status={code.uses >= code.maxUses ? 'used' : 'available'}
              redeemUrl={`${REDEEM_BASE_URL}?token=${encodeURIComponent(code.token)}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Claim;

