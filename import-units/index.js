// One‑time script to import stone_units.xlsx into Firestore "units" collection.
// Run from this folder with: node index.js

const path = require('path');
const admin = require('firebase-admin');
const xlsx = require('xlsx');

// IMPORTANT:
// 1. Download a Firebase service account JSON from:
//    Firebase Console → Project Settings → Service accounts → Generate new private key
// 2. Save it next to this file as "serviceAccountKey.json"
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Path to the Excel file in the project root
const workbookPath = path.join(__dirname, '..', 'stone_units.xlsx');

function readRows() {
  const workbook = xlsx.readFile(workbookPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // defval: '' keeps empty cells as empty strings instead of undefined
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

async function run() {
  const rows = readRows();
  console.log(`Found ${rows.length} rows in stone_units.xlsx`);

  const batchSize = 400;
  let batch = db.batch();
  let written = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];

    // Map to your actual Excel headers.
    // Example row logged previously:
    // { '#': 3826, 'Building Num': '66*', 'Unit Num': 7, Floor: 'TF' }
    const unit = String(row['Unit Num'] || row['Unit'] || row.unit || '').trim();
    const building = String(row['Building Num'] || row['Building'] || row.building || '').trim();
    const floor = String(row.Floor || row['Floor'] || row.floor || '').trim();

    if (!unit || !building) {
      // Skip incomplete lines but keep going.
      // eslint-disable-next-line no-console
      console.warn(`Skipping row ${i + 1} – missing unit or building`, row);
      continue;
    }

    const buildingUnit = `${building}-${unit}`;

    // Use BUILDING-UNIT as the document ID so each unit is uniquely keyed.
    const docRef = db.collection('units').doc(buildingUnit);

    batch.set(docRef, {
      unitNumber: unit,
      building,
      buildingUnit,
      floor,
      claimed: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    written += 1;

    if (written % batchSize === 0) {
      // eslint-disable-next-line no-console
      console.log(`Committing batch at ${written} docs...`);
      await batch.commit();
      batch = db.batch();
    }
  }

  if (written % batchSize !== 0) {
    // eslint-disable-next-line no-console
    console.log('Committing final batch...');
    await batch.commit();
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Wrote ${written} docs to "units" collection.`);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

