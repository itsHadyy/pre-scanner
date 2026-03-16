import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Claim from './pages/Claim';
import Scanner from './pages/Scanner';
import StaffDashboard from './pages/StaffDashboard';
import StaffHome from './pages/StaffHome';
import LaunchScreen from './components/LaunchScreen';
import './styles/global.css';

function App() {
  const [showLaunch, setShowLaunch] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setShowLaunch(false), 10000);
    return () => clearTimeout(id);
  }, []);

  const isStaffSite = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const { host, search } = window.location;
    const isStaffHost = host.includes('pre-qr-scanner');
    const isLocalStaff = host.includes('localhost') && search.includes('staff=1');
    return isStaffHost || isLocalStaff;
  }, []);

  if (showLaunch) {
    return <LaunchScreen />;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-inner">
            <NavLink to="/" className="app-logo">
              <img src="/logo.png" alt="PRE Group" className="logo-image" />
            </NavLink>
          </div>
        </header>
        {isStaffSite && (
          <nav className="app-nav">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/scanner"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              Scanner
            </NavLink>
            <NavLink
              to="/staff/dashboard"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              Dashboard
            </NavLink>
          </nav>
        )}
        <main className="app-main">
          <Routes>
            {!isStaffSite && (
              <>
                <Route path="/" element={<Home />} />
                <Route path="/claim" element={<Claim />} />
                <Route path="/scanner" element={<Scanner />} />
              </>
            )}
            {isStaffSite && (
              <>
                <Route path="/" element={<StaffHome />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

