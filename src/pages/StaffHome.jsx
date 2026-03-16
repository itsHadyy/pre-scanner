import { NavLink } from 'react-router-dom';
import '../styles/scanner.css';

function StaffHome() {
  return (
    <div className="page page-scanner">
      <div className="card scanner-card staff-home-card">
        <h1 className="scanner-title">PRE Staff Portal</h1>
        <p className="scanner-subtitle">
          Choose how you want to handle today&apos;s drink vouchers.
        </p>
        <div className="staff-home-actions">
          <NavLink to="/scanner" className="staff-home-button primary">
            Open Scanner
          </NavLink>
          <NavLink to="/staff/dashboard" className="staff-home-button secondary">
            View Dashboard
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export default StaffHome;

