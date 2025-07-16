import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Dashboard } from "./domains/dashboard";
import { ConfiguracionesPage } from "./domains/settings";
import { ExerciseCrud } from "./domains/exercise";
import { PersonCrud } from "./domains/person";
import { RoutinePage } from "./domains/routine";
import { ConfigProvider } from './shared/contexts';
import { ToastProvider } from './shared/contexts/ToastContext';
import qualityGymLogo from './assets/qualitygym.png';
import "./styles/App.css";

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
  return (
    <ChakraProvider value={defaultSystem}>
      <BrowserRouter>
        <ToastProvider>
          <div className="app-container">
            <Navigation />
            <main className="app-content">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/personas" element={<PersonCrud />} />
                <Route path="/exercises" element={<ExerciseCrud />} />
                <Route path="/routines" element={<RoutinePage />} />
                <Route path="/configuraciones" element={<ConfiguracionesPage />} />
              </Routes>
            </main>
          </div>
        </ToastProvider>
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
