import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ServerHealthGate } from './components/common/ServerHealthGate'
import App from './App'
import './style.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServerHealthGate>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ServerHealthGate>
  </StrictMode>,
)
