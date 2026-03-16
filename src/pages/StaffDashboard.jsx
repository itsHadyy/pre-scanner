import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import '../styles/scanner.css';

function StaffDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // First load units to enrich QR codes with building/floor
        const unitsSnap = await getDocs(collection(db, 'units'));
        const unitsById = {};
        const unitsByBuildingUnit = {};
        unitsSnap.docs.forEach((d) => {
          const u = d.data() || {};
          unitsById[d.id] = u;
          if (u.buildingUnit) {
            unitsByBuildingUnit[u.buildingUnit] = u;
          }
        });

        const snap = await getDocs(collection(db, 'qrCodes'));
        const data = snap.docs.map((d) => {
          const v = d.data();
          const uses = v.uses || 0;
          const maxUses = v.maxUses || 0;
          const remaining = Math.max(maxUses - uses, 0);
          const unitMeta =
            (v.buildingUnit && unitsByBuildingUnit[v.buildingUnit]) ||
            unitsById[v.unitNumber] ||
            null;
          return {
            id: d.id,
            token: v.token,
            unitNumber: v.unitNumber,
            building: v.building || unitMeta?.building,
            buildingUnit: v.buildingUnit || unitMeta?.buildingUnit,
            floor: v.floor || unitMeta?.floor,
            uses,
            maxUses,
            remaining,
          };
        });
        setRows(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page page-scanner">
      <div className="card scanner-card">
        <h1 className="scanner-title">Staff Dashboard</h1>
        <p className="scanner-subtitle">
          Active QR codes and remaining drinks per unit.
        </p>
        {loading && (
          <div className="scanner-message scanner-message-scanning">
            Loading...
          </div>
        )}
        {!loading && (
          <div className="staff-table">
            <div className="staff-table-search">
              <input
                type="text"
                placeholder="Search by unit or building..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="staff-table-header">
              <span>Unit</span>
              <span>Building</span>
              <span>Floor</span>
              <span>Used / Max</span>
              <span>Left</span>
            </div>
            {rows
              .filter((r) => {
                if (!query.trim()) return true;
                const q = query.trim().toLowerCase();
                return (
                  (r.buildingUnit && r.buildingUnit.toLowerCase().includes(q)) ||
                  (r.unitNumber && String(r.unitNumber).toLowerCase().includes(q)) ||
                  (r.building && String(r.building).toLowerCase().includes(q))
                );
              })
              .map((r) => (
              <div key={r.id} className="staff-table-row">
                <span>{r.buildingUnit || r.unitNumber || '—'}</span>
                <span>{r.building || '—'}</span>
                <span>{r.floor || '—'}</span>
                <span>
                  {r.uses}
                  {' / '}
                  {r.maxUses}
                </span>
                <span>{r.remaining}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StaffDashboard;

