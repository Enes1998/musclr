import { Routes, Route, useLocation } from 'react-router-dom';
import Landing from './routes/Landing';
import Logger from './routes/Logger';
import Summary from './routes/Summary';
import ChangelogDrawer from './components/ChangelogDrawer';

function App() {
  const location = useLocation();

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
    </div>
  );
}

export default App;
