import { QRCodeSVG } from 'qrcode.react';
import '../styles/claim.css';

function QRCodeCard({ index, token, status, redeemUrl }) {
  const isUsed = status === 'used' || status === 'USED';

  return (
    <div className={`qr-card ${isUsed ? 'qr-card-used' : ''}`}>
      <div className="qr-card-header">
        <span className="qr-drink-label">
          Drink #{index + 1}
        </span>
        <span className={`qr-status-badge ${isUsed ? 'status-used' : 'status-available'}`}>
          {isUsed ? 'Used' : 'Available'}
        </span>
      </div>
      <div className="qr-image-wrapper">
        <QRCodeSVG value={redeemUrl} size={160} bgColor="#FFFFFF" fgColor="#231F20" />
      </div>
      <p className="qr-token-label">Show this QR to staff</p>
    </div>
  );
}

export default QRCodeCard;
