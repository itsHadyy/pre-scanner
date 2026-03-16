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
const REDEEMED_COLLECTION = 'redeemedDrinks';

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

  // First, atomically update the uses counter
  await runTransaction(db, async (transaction) => {
    const freshSnap = await transaction.get(qrRef);
    const data = freshSnap.data();

    if (data.uses < data.maxUses) {
      transaction.update(qrRef, { uses: data.uses + 1 });
      ok = true;
      resultMessage = 'VALID - Drink Redeemed';
    } else {
      ok = false;
      resultMessage = 'INVALID - QR already used';
    }
  });

  const freshSnap = await getDoc(qrRef);
  const data = freshSnap.data();

  // Outside the transaction, write logs and redeemed entries (best-effort)
  try {
    await addDoc(collection(db, SCAN_LOGS_COLLECTION), {
      token,
      unitNumber: data.unitNumber,
      scannedAt: serverTimestamp(),
      deviceId,
      result: ok ? 'VALID' : 'INVALID_ALREADY_USED',
    });

    if (ok) {
      let unitData = null;
      try {
        const unitRef = doc(db, 'units', data.unitNumber);
        const unitSnap = await getDoc(unitRef);
        if (unitSnap.exists()) {
          unitData = unitSnap.data();
        }
      } catch (e) {
        // ignore enrichment failures
      }

      await addDoc(collection(db, REDEEMED_COLLECTION), {
        token,
        unitNumber: data.unitNumber,
        building: unitData?.building || null,
        buildingUnit: unitData?.buildingUnit || null,
        floor: unitData?.floor || null,
        redeemedAt: serverTimestamp(),
        deviceId,
        qrCodeId: qrRef.id,
        useNumber: data.uses, // this is the updated uses
        maxUses: data.maxUses,
      });
    }
  } catch (e) {
    // logging failures should not affect redemption result
  }

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
  try {
    const unitsCol = collection(db, 'units');
    let uq;
    if (data.buildingUnit) {
      uq = query(unitsCol, where('buildingUnit', '==', data.buildingUnit));
    } else if (data.unitNumber) {
      uq = query(unitsCol, where('unitNumber', '==', data.unitNumber));
    }
    if (uq) {
      const uSnap = await getDocs(uq);
      if (!uSnap.empty) {
        const uDoc = uSnap.docs[0];
        unit = { id: uDoc.id, ...uDoc.data() };
      }
    }
  } catch (e) {
    // best-effort enrichment; ignore failures
  }

  return { id: docSnap.id, ...data, unit };
}

