import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import Landing from './routes/Landing';
import Logger from './routes/Logger';
import Summary from './routes/Summary';
import ChangelogDrawer from './components/ChangelogDrawer';

function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const getScreenLabel = () => {
    switch (location.pathname) {
      case '/': return '01 Landing';
      case '/log': return '02 Workout Logger';
      case '/summary': return '03 Weekly Summary';
      default: return '';
    }
  };

  return (
    <div className="app" data-screen-label={getScreenLabel()}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/log" element={<Logger />} />
        <Route path="/summary" element={<Summary />} />
      </Routes>

      <ChangelogDrawer />

      {/* Screen switcher chip — debug/nav aid */}
      {location.pathname !== '/' && (
        <div className="screen-switcher">
          <button className={location.pathname === '/' ? 'on' : ''} onClick={() => navigate('/')}>
            <span className="ss-num mono">01</span><span>Landing</span>
          </button>
          <button className={location.pathname === '/log' ? 'on' : ''} onClick={() => navigate('/log')}>
            <span className="ss-num mono">02</span><span>Logger</span>
          </button>
          <button className={location.pathname === '/summary' ? 'on' : ''} onClick={() => navigate('/summary')}>
            <span className="ss-num mono">03</span><span>Summary</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
