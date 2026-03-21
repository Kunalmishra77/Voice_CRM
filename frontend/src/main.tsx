import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

// Dismiss the HTML preloader after React hydrates
const dismissPreloader = () => {
  const el = document.getElementById('preloader');
  if (el) {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 650);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Give the app one tick to paint before fading the preloader
requestAnimationFrame(() => {
  setTimeout(dismissPreloader, 1200);
});
