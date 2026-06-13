import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import { PopupProvider } from './context/PopupContext.jsx'
import './css/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PopupProvider>
          <SocketProvider>
            <App />
          </SocketProvider>
        </PopupProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
