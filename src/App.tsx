import React, { useState } from 'react';
import ScheduleTable from './ScheduleTable';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import DirectoryManagerPage from './DirectoryManagerPage';

function NavTabs() {
  const location = useLocation();
  return (
    <nav style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 32 }}>
      <Link
        to="/"
        style={{
          padding: '12px 32px',
          borderRadius: 12,
          background: location.pathname === '/' ? '#1976d2' : '#f5f5f5',
          color: location.pathname === '/' ? '#fff' : '#1976d2',
          fontWeight: 700,
          fontSize: 18,
          textDecoration: 'none',
          boxShadow: location.pathname === '/' ? '0 2px 8px rgba(25,118,210,0.08)' : 'none',
          border: 'none',
          transition: 'all 0.2s',
        }}
      >
        Составить расписание
      </Link>
      <Link
        to="/directories"
        style={{
          padding: '12px 32px',
          borderRadius: 12,
          background: location.pathname === '/directories' ? '#1976d2' : '#f5f5f5',
          color: location.pathname === '/directories' ? '#fff' : '#1976d2',
          fontWeight: 700,
          fontSize: 18,
          textDecoration: 'none',
          boxShadow: location.pathname === '/directories' ? '0 2px 8px rgba(25,118,210,0.08)' : 'none',
          border: 'none',
          transition: 'all 0.2s',
        }}
      >
        Списки
      </Link>
    </nav>
  );
}

function App() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <Router>
      <div className="App">
        <NavTabs />
        <Routes>
          <Route path="/" element={
            <>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 17, color: '#1976d2' }}>
                  Дата:
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    style={{
                      marginLeft: 12,
                      padding: '8px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #b0bec5',
                      fontSize: 16,
                      outline: 'none',
                      transition: 'border 0.2s',
                    }}
                  />
                </label>
              </div>
              <ScheduleTable date={date} />
            </>
          } />
          <Route path="/directories" element={<DirectoryManagerPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
