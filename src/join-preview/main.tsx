import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import JoinPage from './JoinPage'
import '../index.css'
import '../../new/fonts.css'
import './join.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JoinPage />
  </StrictMode>,
)
