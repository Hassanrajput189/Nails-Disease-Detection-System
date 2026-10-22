import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles.css';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NoticeProvider } from './context/NoticeContext.jsx';
import { applySavedTheme } from './components/ThemePicker.jsx';

applySavedTheme();

// Browser tab title + favicon (works even without editing index.html)
document.title = 'Nail Bite Detector';
const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d00a18"/><stop offset="1" stop-color="#ff3b3b"/></linearGradient><mask id="m"><rect width="48" height="48" fill="#fff"/><circle cx="29" cy="13.5" r="3.4"/><circle cx="32.6" cy="18.2" r="2.6"/><circle cx="25.6" cy="11.8" r="2.2"/></mask></defs><rect width="48" height="48" rx="14" fill="url(#g)"/><path mask="url(#m)" fill="#fff" d="M15.5 36V22.5C15.5 15 19.2 11 24 11s8.5 4 8.5 11.5V36c0 1.4-1.1 2.5-2.5 2.5H18c-1.4 0-2.5-1.1-2.5-2.5z"/><path d="M11 27h26" stroke="url(#g)" stroke-width="2.6" stroke-linecap="round"/></svg>`;
let fav = document.querySelector('link[rel~="icon"]');
if (!fav) { fav = document.createElement('link'); fav.rel = 'icon'; document.head.appendChild(fav); }
fav.type = 'image/svg+xml';
fav.href = 'data:image/svg+xml,' + encodeURIComponent(favSvg);

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <NoticeProvider>
        <App />
      </NoticeProvider>
    </AuthProvider>
  </BrowserRouter>
);
