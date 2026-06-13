import { useState, useEffect } from 'react';
import '../css/nonetwork.css';

export default function NoNetwork() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className="no-network-overlay">
      <div className="no-network-content">
        <div className="no-network-icon">🌐❌</div>
        <h2>No Internet Connection</h2>
        <p>Please check your network settings and try again.</p>
        <p className="no-network-subtext">The application will automatically reconnect when your connection is restored.</p>
      </div>
    </div>
  );
}
