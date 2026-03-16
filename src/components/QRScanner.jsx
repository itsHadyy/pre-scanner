import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import '../styles/scanner.css';
import { redeemQrCode } from '../services/qrService';

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

        const deviceId = navigator.userAgent || 'unknown-device';
        const result = await redeemQrCode(token, deviceId);

        setMessage(result.message);
        setStatus(result.ok ? 'success' : 'error');
      },
      () => {
        // ignore scan failure callbacks
      },
    );

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="scanner-card">
      <h1 className="scanner-title">Drink Scanner</h1>
      <p className="scanner-subtitle">Scan the customer&apos;s QR code to redeem a drink.</p>
      <div id="qr-reader" className="qr-reader-container" />
      <div className={`scanner-message scanner-message-${status}`}>
        {message || 'Ready to scan.'}
      </div>
    </div>
  );
}

export default QRScanner;

