import '../styles/launch.css';

function LaunchScreen() {
  return (
    <div className="launch-screen">
      <div className="launch-orbit" />
      <div className="launch-orbit launch-orbit-second" />

      <div className="launch-content">
        <img src="/logo.png" alt="PRE Group" className="launch-logo" />
        <h1 className="launch-title">Claim Your Free Drinks</h1>
        <p className="launch-subtitle">
          We&apos;re getting your units and vouchers ready.
        </p>

        <ul className="launch-steps">
          <li className="launch-step">
            <span className="launch-step-number">1</span>
            Start typing your building or unit.
          </li>
          <li className="launch-step">
            <span className="launch-step-number">2</span>
            Pick your exact unit from the list.
          </li>
          <li className="launch-step">
            <span className="launch-step-number">3</span>
            Show your QR codes to staff.
          </li>
        </ul>

        <div className="launch-progress-wrapper">
          <p className="launch-progress-label">Loading...</p>
          <div className="launch-progress">
            <div className="launch-progress-bar" />
          </div>
        </div>

        <div className="launch-powered">
          <p className="launch-powered-label">Powered by</p>
          <img src="/fut-app.png" alt="FutApp" className="launch-powered-logo" />
        </div>
      </div>
    </div>
  );
}

export default LaunchScreen;
