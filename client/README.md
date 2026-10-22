# Prism – Nail Biting Detection (React + Bootstrap)

## Run
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in /dist
```

## Structure
```
src/
  main.jsx                 entry (Router, AuthProvider, Bootstrap CSS)
  App.jsx                  routes + protected pages
  styles.css               theme, glass look, animations
  pages/
    Login.jsx              login page (+ welcome popup)
    Signup.jsx             sign-up page (+ confetti)
    Predict.jsx            image upload, analyzing popup, result popup
    Results.jsx            saved history, stats, delete popup
  components/
    AuthLayout.jsx         shared left side (same picture on login + signup)
    Navbar.jsx             top navigation
    ResultModal.jsx        animated confidence ring + bars
    ThemePicker.jsx        5 color themes (🎨 button)
  context/AuthContext.jsx  signup / login / logout
  utils/
    storage.js             safe localStorage wrapper
    predict.js             SIMULATED prediction -> replace with your model API
    confetti.js
```

## Connect your real model
Edit `predict()` in `src/utils/predict.js` and return `[{ l: 'Nail biting', p: 96.4 }, ...]`.

## Use your own project picture
In `src/components/AuthLayout.jsx` put your image in `src/assets/` and use it in `HeroPicture`
(a comment shows where). Users can also press "Use my photo" on the page.

Note: accounts/results are stored in the browser (localStorage) for the demo. Use a real backend for production.
