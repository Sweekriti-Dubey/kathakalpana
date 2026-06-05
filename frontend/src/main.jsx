import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CSS Import Order - Consolidated Styling System 
// 1. theme.css    - CSS variables (Design Tokens) - must load first
// 2. index.css    - Tailwind directives + @layer styles
import './theme.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)