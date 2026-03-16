import { useEffect, useMemo, useState } from 'react';
import '../styles/home.css';
import { searchUnitsByPrefix } from '../services/unitService';

function UnitInput({ onSuccess }) {
  const [unit, setUnit] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let active = true;
    const value = unit.trim();
    if (value.length < 2) {
      setOptions([]);
      setSearching(false);
      return;
    }

    setSearching(true);

    searchUnitsByPrefix(value)
      .then((results) => {
        if (!active) return;
        setOptions(results || []);
      })
      .catch(() => {
        if (!active) return;
        setOptions([]);
      })
      .finally(() => {
        if (!active) return;
        setSearching(false);
      });

    return () => {
      active = false;
    };
  }, [unit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!unit.trim()) {
      setError('Please enter a unit number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSuccess(unit.trim());
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUnit = (value) => {
    setUnit(value);
    setDropdownOpen(false);
    setError('');
  };

  const handleChange = (e) => {
    const next = e.target.value;
    setUnit(next);
    setDropdownOpen(next.trim().length >= 1);
  };

  return (
    <form className="unit-form" onSubmit={handleSubmit}>
      <label className="unit-label" htmlFor="unit-input">
        Enter your unit number
      </label>
      <div className="unit-input-wrapper">
        <input
          id="unit-input"
          className="unit-input"
          type="text"
          placeholder="Start typing (e.g. 1-5 or 30)"
          value={unit}
          onChange={handleChange}
          onFocus={() => setDropdownOpen(true)}
          autoComplete="off"
        />
        {dropdownOpen && (searching || options.length > 0) && (
          <ul className="unit-dropdown">
            {searching && (
              <li className="unit-dropdown-item unit-dropdown-loading">
                Searching...
              </li>
            )}
            {!searching &&
              options.map((opt) => (
                <li
                  key={opt.id}
                  className="unit-dropdown-item"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectUnit(opt.buildingUnit);
                  }}
                >
                  {opt.buildingUnit}
                  {opt.floor ? ` · Floor ${opt.floor}` : ''}
                </li>
              ))}
          </ul>
        )}
      </div>
      {error && <p className="unit-error">{error}</p>}
      <button
        type="submit"
        className={`primary-button ${loading ? 'loading' : ''}`}
        disabled={loading}
      >
        {loading ? <span className="btn-spinner" /> : 'Claim'}
      </button>
    </form>
  );
}

export default UnitInput;

