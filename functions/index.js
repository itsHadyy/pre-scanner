const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

exports.claimDrinks = functions.https.onCall(async (data) => {
  const unitNumber = String(data.unitNumber || '').trim();
  if (!unitNumber) {
    throw new functions.https.HttpsError('invalid-argument', 'Unit number is required.');
  }

  const unitRef = db.collection('units').doc(unitNumber);
  const unitSnap = await unitRef.get();

  if (!unitSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Invalid Unit Number');
  }

  const unitData = unitSnap.data();

  if (unitData.claimed) {
    const qrSnap = await db.collection('qrCodes').where('unitNumber', '==', unitNumber).get();
    const existing = qrSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { unitNumber, qrCodes: existing, alreadyClaimed: true };
  }

  const batch = db.batch();
  const qrCodes = [];

  for (let i = 0; i < 4; i += 1) {
    const token = generateToken(32);
    const qrRef = db.collection('qrCodes').doc();
    const qrData = {
      token,
      unitNumber,
      uses: 0,
      maxUses: 1,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    batch.set(qrRef, qrData);
    qrCodes.push({ id: qrRef.id, ...qrData });
  }

  batch.update(unitRef, { claimed: true });
  await batch.commit();

  return { unitNumber, qrCodes, alreadyClaimed: false };
});

exports.redeemDrink = functions.https.onCall(async (data) => {
  const token = String(data.token || '').trim();
  const deviceId = data.deviceId || 'unknown-device';

  if (!token) {
    throw new functions.https.HttpsError('invalid-argument', 'Token is required.');
  }

  const snap = await db.collection('qrCodes').where('token', '==', token).limit(1).get();
  if (snap.empty) {
    return { ok: false, message: 'INVALID - QR not found' };
  }

  const docRef = snap.docs[0].ref;

  const result = await db.runTransaction(async (tx) => {
    const fresh = await tx.get(docRef);
    const data = fresh.data();

    if (data.uses < data.maxUses) {
      tx.update(docRef, { uses: data.uses + 1 });

      await db.collection('scanLogs').add({
        token,
        unitNumber: data.unitNumber,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        deviceId,
        result: 'VALID',
      });

      return { ok: true, message: 'VALID - Drink Redeemed' };
    }

    await db.collection('scanLogs').add({
      token,
      unitNumber: data.unitNumber,
      scannedAt: admin.firestore.FieldValue.serverTimestamp(),
      deviceId,
      result: 'INVALID_ALREADY_USED',
    });

    return { ok: false, message: 'INVALID - QR already used' };
  });

  return result;
});

function generateToken(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i += 1) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

