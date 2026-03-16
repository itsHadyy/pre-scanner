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

  const primaryCode = qrCodes[0];
  const redeemedCount = primaryCode ? Math.min(primaryCode.uses || 0, TOTAL_DRINKS) : 0;

  return (
    <div className="page page-claim">
      <div className="card claim-card">
        <div className="claim-card-header">
          <div className="claim-unit-pill">
            Unit
            {' '}
            {unitNumber}
          </div>
          <div className="claim-count-pill">
            {redeemedCount}
            /
            {TOTAL_DRINKS}
            {' '}
            drinks
          </div>
        </div>

        <h1 className="claim-title">Your Drink Vouchers</h1>
        <p className="claim-subtitle">
          Show this screen to staff to redeem your complimentary drinks.
        </p>

        <DrinkCounter redeemed={redeemedCount} total={TOTAL_DRINKS} />

        {loading && (
          <div className="loading-row">
            <span className="loader" />
            <span className="loading-text">Loading your vouchers...</span>
          </div>
        )}

        <div className="qr-grid">
          {primaryCode && redeemedCount < TOTAL_DRINKS && (
            <QRCodeCard
              index={redeemedCount}
              token={primaryCode.token}
              status="available"
              redeemUrl={`${REDEEM_BASE_URL}?token=${encodeURIComponent(primaryCode.token)}`}
            />
          )}

          {!loading && !primaryCode && (
            <p className="claim-empty">
              There are no vouchers available for this unit yet.
            </p>
          )}

          {primaryCode && redeemedCount >= TOTAL_DRINKS && (
            <p className="claim-all-used">
              All your drinks have been redeemed. Thank you!
            </p>
          )}
        </div>

        <p className="claim-footnote">Keep this page open when you approach the bar.</p>
      </div>
    </div>
  );
}

export default Claim;

