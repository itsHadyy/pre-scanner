// One‑time script to import units from an Excel file into Firestore "units" collection.
// Run from this folder:
//   node index.js                  → imports stone_units.xlsx (default)
//   node index.js stone_park.xlsx  → imports stone_park.xlsx (place file in pre-scanner root, or use full path)

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

// Optional: pass filename as first arg (e.g. stone_park.xlsx). Default: stone_units.xlsx
const fileName = process.argv[2] || 'stone_units.xlsx';
const workbookPath = path.isAbsolute(fileName)
  ? fileName
  : path.join(__dirname, '..', fileName);

function readRows() {
  const workbook = xlsx.readFile(workbookPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  // defval: '' keeps empty cells as empty strings instead of undefined
  return xlsx.utils.sheet_to_json(sheet, { defval: '' });
}

async function run() {
  const rows = readRows();
  console.log(`Found ${rows.length} rows in ${path.basename(workbookPath)}`);

  const batchSize = 400;
  let batch = db.batch();
  let written = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];

    // Support two formats:
    // 1) Single "units" column (e.g. stone_park.xlsx): { units: 'B155H' }
    // 2) Separate columns (e.g. stone_units.xlsx): Building Num, Unit Num, Floor
    const singleUnit = String(row.units || row.Units || '').trim();
    let unit;
    let building;
    let floor;
    let buildingUnit;

    if (singleUnit) {
      buildingUnit = singleUnit;
      unit = singleUnit;
      building = singleUnit;
      floor = '';
    } else {
      unit = String(row['Unit Num'] || row['Unit'] || row.unit || '').trim();
      building = String(row['Building Num'] || row['Building'] || row.building || '').trim();
      floor = String(row.Floor || row['Floor'] || row.floor || '').trim();
      if (!unit || !building) {
        // eslint-disable-next-line no-console
        console.warn(`Skipping row ${i + 1} – missing unit or building`, row);
        continue;
      }
      buildingUnit = `${building}-${unit}`;
    }

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

