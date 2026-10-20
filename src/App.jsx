import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import Dashboard from './domains/dashboard/pages/Dashboard';
import AnalyticsDashboard from './domains/dashboard/pages/AnalyticsDashboard';
import PersonCrud from './domains/person/pages/PersonCrud';
import ExerciseCrud from './domains/exercise/pages/ExerciseCrud';
import { RoutineManager } from './domains/routine';
import ConfiguracionesPage from './domains/settings/pages/ConfiguracionesPage';
import BillingPage from './domains/billing/pages/BillingPage';
import SalesPage from './domains/sales/pages/SalesPage';
import { ConfigProvider } from './shared/contexts';
import { ToastProvider } from './shared/contexts/ToastContext';
import Updater from './components/Updater';
import qualityGymLogo from './assets/qualitygym.png';
import "./styles/App.css";
import { invoke } from '@tauri-apps/api/core';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="app-navigation">
      <div className="nav-container">
        <Link to="/" className="nav-brand">
          <img src={qualityGymLogo} alt="Quality GYM" className="nav-brand-logo" />
          Quality GYM
        </Link>

        <ul className="nav-links">
          <li>
            <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active calendar' : ''}`}>
              <span className="nav-link-icon">📊</span>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/pagos" className={`nav-link ${location.pathname === '/pagos' ? 'active payments' : ''}`}>
              <span className="nav-link-icon">💳</span>
              Pagos
            </Link>
          </li>
          <li><Link to="/ventas" className={`nav-link ${location.pathname === '/ventas' ? 'active payments' : ''}`}><span className="nav-link-icon">🛒</span>Ventas</Link></li>
          <li>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active calendar' : ''}`}
            >
              <span className="nav-link-icon">📅</span>
              Calendario
            </Link>
          </li>
          <li>
            <Link
              to="/personas"
              className={`nav-link ${location.pathname === '/personas' ? 'active persons' : ''}`}
            >
              <span className="nav-link-icon">👥</span>
              Personas
            </Link>
          </li>
          <li>
            <Link
              to="/exercises"
              className={`nav-link ${location.pathname === '/exercises' ? 'active exercises' : ''}`}
            >
              <span className="nav-link-icon">🏋️</span>
              Ejercicios
            </Link>
          </li>
          <li>
            <Link
              to="/routines"
              className={`nav-link ${location.pathname === '/routines' ? 'active routines' : ''}`}
            >
              <span className="nav-link-icon">📋</span>
              Rutinas
            </Link>
          </li>
          <li>
            <Link 
              to="/configuraciones" 
              className={`nav-link ${location.pathname === '/configuraciones' ? 'active settings' : ''}`}
            >
              <span className="nav-link-icon">⚙️</span>
              Configuraciones
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}

function App() {
  useEffect(() => {
    const backup = async () => {
      try {
        console.log('Attempting to execute backup...');
        await invoke('execute_backup');
        console.log('Database backup successful');
      } catch (error) {
        console.error('Error backing up database:', error);
      }
    };

    backup();
  }, []);

  useEffect(() => {
    let timer;
    const reconcile = async () => {
      try {
        await invoke('reconcile_payment_periods');
      } catch (error) {
        console.error('Error reconciling payment periods:', error);
      }
      const now = new Date();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 1);
      timer = window.setTimeout(reconcile, nextMonth.getTime() - now.getTime());
    };
    void reconcile();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <ChakraProvider value={defaultSystem}>
      <ConfigProvider><BrowserRouter>
        <ToastProvider>
          <div className="app-container">
            <Navigation />
            <main className="app-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/dashboard" element={<AnalyticsDashboard />} />
                <Route path="/personas" element={<PersonCrud />} />
                <Route path="/exercises" element={<ExerciseCrud />} />
                <Route path="/routines" element={<RoutineManager />} />
                <Route path="/pagos" element={<BillingPage />} />
                <Route path="/ventas" element={<SalesPage />} />
                <Route path="/configuraciones" element={<ConfiguracionesPage />} />
              </Routes>
            </main>
            <Updater />
          </div>
        </ToastProvider>
      </BrowserRouter></ConfigProvider>
    </ChakraProvider>
  );
}

export default App;
