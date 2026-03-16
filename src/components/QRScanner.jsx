import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import '../styles/scanner.css';
import { redeemQrCode, getQrCodeStatus } from '../services/qrService';

function extractTokenFromText(text) {
  try {
    const url = new URL(text);
    const tokenParam = url.searchParams.get('token');
    if (tokenParam) return tokenParam;
  } catch (e) {
    // Not a URL, fall through
  }
  return text;
}

function QRScanner() {
  const scannerRef = useRef(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | success | error | scanning
  const [currentToken, setCurrentToken] = useState(null);
  const [usesInfo, setUsesInfo] = useState(null); // { uses, maxUses }
  const [unitInfo, setUnitInfo] = useState(null); // { building, floor, buildingUnit, ... }

  useEffect(() => {
    const scanner = new Html5QrcodeScanner('qr-reader', {
      fps: 10,
      qrbox: 250,
    });

    scannerRef.current = scanner;
    setStatus('scanning');

    scanner.render(
      async (decodedText) => {
        const token = extractTokenFromText(decodedText);
        setStatus('scanning');
        setMessage('Verifying QR code...');
        setCurrentToken(null);
        setUsesInfo(null);
        setUnitInfo(null);

        const info = await getQrCodeStatus(token);
        if (!info) {
          setStatus('error');
          setMessage('INVALID - QR not found');
          return;
        }

        setCurrentToken(token);
        setUsesInfo({ uses: info.uses || 0, maxUses: info.maxUses || 0 });
        setUnitInfo(
          info.unit || {
            building: info.building,
            floor: info.floor,
            buildingUnit: info.buildingUnit,
            unitNumber: info.unitNumber,
          },
        );

        if (info.uses >= info.maxUses) {
          setStatus('error');
          setMessage('INVALID - QR already fully used');
        } else {
          setStatus('success');
          setMessage('VALID - Ready to redeem. Tap Redeem when confirmed.');
        }
      },
      () => {
        // ignore scan failure callbacks
      },
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  const handleRedeem = async () => {
    if (!currentToken || !usesInfo) return;
    setStatus('scanning');
    setMessage('Redeeming drink...');

    const deviceId = navigator.userAgent || 'unknown-device';
    const result = await redeemQrCode(currentToken, deviceId);

    setMessage(result.message);
    setStatus(result.ok ? 'success' : 'error');

    if (result.ok) {
      const updated = await getQrCodeStatus(currentToken);
      if (updated) {
        setUsesInfo({ uses: updated.uses || 0, maxUses: updated.maxUses || 0 });
        setUnitInfo(
          updated.unit || {
            building: updated.building,
            floor: updated.floor,
            buildingUnit: updated.buildingUnit,
            unitNumber: updated.unitNumber,
          },
        );
      }
    }
  };

  return (
    <div className="scanner-card">
      <h1 className="scanner-title">Drink Scanner</h1>
      <p className="scanner-subtitle">
        Scan the customer&apos;s QR code. Confirm, then tap Redeem.
      </p>
      <div id="qr-reader" className="qr-reader-container" />
      <div className={`scanner-message scanner-message-${status}`}>
        {message || 'Ready to scan.'}
      </div>
      {unitInfo && (
        <div className="scanner-unit-card">
          <div className="scanner-unit-row">
            <span className="scanner-unit-label">Building</span>
            <span className="scanner-unit-value">{unitInfo.building || '—'}</span>
          </div>
          <div className="scanner-unit-row">
            <span className="scanner-unit-label">Unit</span>
            <span className="scanner-unit-value">
              {unitInfo.buildingUnit || unitInfo.unitNumber || '—'}
            </span>
          </div>
          <div className="scanner-unit-row">
            <span className="scanner-unit-label">Floor</span>
            <span className="scanner-unit-value">{unitInfo.floor || '—'}</span>
          </div>
        </div>
      )}
      {currentToken && usesInfo && usesInfo.maxUses > 0 && usesInfo.uses < usesInfo.maxUses && (
        <button
          type="button"
          className="primary-button scanner-redeem-button"
          onClick={handleRedeem}
        >
          Redeem drink (
          {usesInfo.uses}
          {' '}
          /
          {' '}
          {usesInfo.maxUses}
          )
        </button>
      )}
      {currentToken && usesInfo && usesInfo.maxUses > 0 && usesInfo.uses >= usesInfo.maxUses && (
        <p className="scanner-usage-text">
          This QR code has already been used
          {' '}
          {usesInfo.maxUses}
          {' '}
          times.
        </p>
      )}
    </div>
  );
}

export default QRScanner;

