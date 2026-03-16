import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  startAt,
  endBefore,
} from 'firebase/firestore';
import { db, firestoreTimestamp } from './firebase';

const UNITS_COLLECTION = 'units';
const QR_CODES_COLLECTION = 'qrCodes';

export async function searchUnitsByPrefix(prefix) {
  const raw = String(prefix || '');
  const trimmed = raw.trim().replace(/\s*-\s*/g, '-');
  if (!trimmed || trimmed.length < 1) return [];

  const colRef = collection(db, UNITS_COLLECTION);

  // We run up to three prefix queries:
  // - by buildingUnit (e.g. "66*-7")
  // - by building (e.g. "66*")
  // - by unitNumber (e.g. "7")
  const queries = [
    query(
      colRef,
      orderBy('buildingUnit'),
      startAt(trimmed),
      endBefore(`${trimmed}\uf8ff`),
    ),
    query(
      colRef,
      orderBy('building'),
      startAt(trimmed),
      endBefore(`${trimmed}\uf8ff`),
    ),
    query(
      colRef,
      orderBy('unitNumber'),
      startAt(trimmed),
      endBefore(`${trimmed}\uf8ff`),
    ),
  ];

  const snapshots = await Promise.all(queries.map((q) => getDocs(q)));

  const seen = new Map();

  snapshots.forEach((snap) => {
    snap.docs.forEach((d) => {
      if (seen.has(d.id)) return;
      const data = d.data() || {};
      seen.set(d.id, {
        id: d.id,
        buildingUnit: data.buildingUnit || `${data.building || ''}-${data.unitNumber || ''}`.trim(),
        unitNumber: data.unitNumber,
        building: data.building,
        floor: data.floor,
      });
    });
  });

  return Array.from(seen.values()).slice(0, 12);
}

export async function validateAndClaimUnit(unitNumber) {
  // Here unitNumber is actually BUILDING-UNIT entered/selected by the user
  const trimmed = String(unitNumber || '')
    .trim()
    .replace(/\s*-\s*/g, '-');
  if (!trimmed) {
    throw new Error('Please enter a unit number.');
  }

  const unitRef = doc(collection(db, UNITS_COLLECTION), trimmed);
  const snapshot = await getDoc(unitRef);

  if (!snapshot.exists()) {
    throw new Error('Invalid Unit Number');
  }

  const data = snapshot.data();

  const realUnitNumber = data.unitNumber || trimmed;

  if (data.claimed) {
    // Already claimed – just return existing QR codes
    const qrCodes = await fetchUnitQrCodes(realUnitNumber);
    return { unitNumber: realUnitNumber, qrCodes, alreadyClaimed: true };
  }

  // Not claimed yet – generate 4 QR codes and mark claimed
  const qrCodes = [];

  for (let i = 0; i < 4; i += 1) {
    const token = generateToken(32);

    const qrDoc = await addDoc(collection(db, QR_CODES_COLLECTION), {
      token,
      unitNumber: realUnitNumber,
      uses: 0,
      maxUses: 1,
      status: 'active',
      createdAt: firestoreTimestamp(),
    });

    qrCodes.push({
      id: qrDoc.id,
      token,
      unitNumber: realUnitNumber,
      uses: 0,
      maxUses: 1,
      status: 'active',
    });
  }

  await updateDoc(unitRef, { claimed: true });

  return { unitNumber: realUnitNumber, qrCodes, alreadyClaimed: false };
}

export function generateToken(length = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const array = new Uint32Array(length);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
    for (let i = 0; i < length; i += 1) {
      token += chars[array[i] % chars.length];
    }
  } else {
    for (let i = 0; i < length; i += 1) {
      token += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return token;
}

export async function fetchUnitQrCodes(unitNumber) {
  const collectionRef = collection(db, QR_CODES_COLLECTION);
  const q = query(collectionRef, where('unitNumber', '==', String(unitNumber)));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

