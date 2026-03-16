import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Home from './pages/Home';
import Claim from './pages/Claim';
import Scanner from './pages/Scanner';
import LaunchScreen from './components/LaunchScreen';
import './styles/global.css';

function App() {
  const [showLaunch, setShowLaunch] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setShowLaunch(false), 10000);
    return () => clearTimeout(id);
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
            <nav className="app-nav">
              <NavLink
                to="/scanner"
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'nav-link-active' : ''}`
                }
              >
                Scanner
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/claim" element={<Claim />} />
            <Route path="/scanner" element={<Scanner />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;

