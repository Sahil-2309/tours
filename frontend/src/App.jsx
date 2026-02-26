import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { ConfirmProvider } from './context/ConfirmContext';
import Navbar from './components/Navbar';
import Templates from './pages/Templates';
import WordPressSettings from './pages/WordPressSettings';
import ProcessExcel from './pages/ProcessExcel';
import Results from './pages/Results';
import History from './pages/History';
import './index.css';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            <Navbar />
            
            <div className="relative pt-6 pb-12 px-4 min-h-screen">
              <Routes>
                <Route path="/" element={<Templates />} />
                <Route path="/wordpress" element={<WordPressSettings />} />
                <Route path="/process" element={<ProcessExcel />} />
                <Route path="/results/:id" element={<Results />} />
                <Route path="/history" element={<History />} />
              </Routes>
            </div>
          </div>
        </Router>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
