import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ConfigProvider } from './shared/contexts'
import './styles/theme.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
)
