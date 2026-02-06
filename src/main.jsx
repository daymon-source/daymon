import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  // Temporarily disabled StrictMode to test duplicate egg rendering
  // <StrictMode>
  <App />
  // </StrictMode>,
)
