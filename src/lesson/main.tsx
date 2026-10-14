import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import LessonPage from './LessonPage'
import '../index.css'
import '../join/join.css'
import './lesson.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LessonPage />
  </StrictMode>,
)
