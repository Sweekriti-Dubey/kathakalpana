import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// CSS Import Order - Consolidated Styling System 
// 1. theme.css    - CSS variables (Design Tokens) - must load first
// 2. index.css    - Tailwind directives + @layer styles
// 3. CometChat    - UIKit default CSS variables
// 4. chat.css     - Custom chat widget styles
import './theme.css'
import './index.css'
import '@cometchat/chat-uikit-react/css-variables.css'
import './components/styles/chat.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)