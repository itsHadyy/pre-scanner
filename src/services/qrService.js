import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  runTransaction,
  getDocs,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const QR_CODES_COLLECTION = 'qrCodes';
const SCAN_LOGS_COLLECTION = 'scanLogs';

export function subscribeToUnitQrCodes(unitNumber, callback) {
  const colRef = collection(db, QR_CODES_COLLECTION);
  const q = query(colRef, where('unitNumber', '==', String(unitNumber)));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const qrCodes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(qrCodes);
  });

  return unsubscribe;
}

export async function redeemQrCode(token, deviceId = 'unknown-device') {
  const colRef = collection(db, QR_CODES_COLLECTION);
  const q = query(colRef, where('token', '==', token));

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return { ok: false, message: 'INVALID - QR not found' };
  }

  const qrDoc = snapshot.docs[0];
  const qrRef = doc(db, QR_CODES_COLLECTION, qrDoc.id);

  let resultMessage = '';
  let ok = false;

  await runTransaction(db, async (transaction) => {
    const freshSnap = await transaction.get(qrRef);
    const data = freshSnap.data();

    if (data.uses < data.maxUses) {
      transaction.update(qrRef, { uses: data.uses + 1 });

      await addDoc(collection(db, SCAN_LOGS_COLLECTION), {
        token,
        unitNumber: data.unitNumber,
        scannedAt: serverTimestamp(),
        deviceId,
        result: 'VALID',
      });

      ok = true;
      resultMessage = 'VALID - Drink Redeemed';
    } else {
      await addDoc(collection(db, SCAN_LOGS_COLLECTION), {
        token,
        unitNumber: data.unitNumber,
        scannedAt: serverTimestamp(),
        deviceId,
        result: 'INVALID_ALREADY_USED',
      });

      ok = false;
      resultMessage = 'INVALID - QR already used';
    }
  });

  return { ok, message: resultMessage };
}

export async function getQrCodeStatus(token) {
  const colRef = collection(db, QR_CODES_COLLECTION);
  const q = query(colRef, where('token', '==', token));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const docSnap = snapshot.docs[0];
  const data = docSnap.data() || {};

  let unit = null;
  if (data.unitNumber) {
    const unitRef = doc(db, 'units', data.unitNumber);
    const unitSnap = await getDoc(unitRef);
    if (unitSnap.exists()) {
      unit = { id: unitSnap.id, ...unitSnap.data() };
    }
  }

  return { id: docSnap.id, ...data, unit };
}

