import { useEffect, useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import Logo from './Logo.jsx';

export const APP_NAME = 'Nail Disease Detector';

const WORDS = ['Detect Early Signs of Nail Diseases.', 'your nail health.', 'nail disease early.'];
const LEAD = 'Instantly know ';
const LONGEST = WORDS.reduce((a, b) => (b.length > a.length ? b : a));

function Typewriter() {
  const [text, setText] = useState('');
  useEffect(() => {
    let wi = 0, ci = 0, del = false, t;
    const tick = () => {
      const w = WORDS[wi];
      setText(w.slice(0, ci));
      if (!del && ci === w.length) { del = true; t = setTimeout(tick, 1400); return; }
      if (del && ci === 0) { del = false; wi = (wi + 1) % WORDS.length; }
      ci += del ? -1 : 1;
      t = setTimeout(tick, del ? 30 : 70);
    };
    tick();
    return () => clearTimeout(t);
  }, []);
  return <><span className="gt">{text}</span><span className="caret" /></>;
}

/*
  Fixed project picture (shared by Login, Signup, Forgot/Verify/Reset pages).
  There is no upload option any more, so everyone always sees the same image.
  To use your own photo: put it in /public (e.g. public/nail-hero.jpg) and set
  HERO_IMAGE = '/nail-hero.jpg'. Leave it empty to use the built-in hand illustration.
*/
const HERO_IMAGE = '';

function HeroPicture() {
  return (
    <div className="shot glass">
      {HERO_IMAGE ? (
        <img src={HERO_IMAGE} alt="Nail Disease Detector" />
      ) : (
        <svg viewBox="0 0 460 300" preserveAspectRatio="xMidYMid slice" aria-label="Hand with nails being scanned">
          <defs>
            <linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--a)' }} />
              <stop offset="1" style={{ stopColor: 'var(--b)' }} />
            </linearGradient>
          </defs>
          <g fill="#e2b49a">
            <rect x="150" y="160" width="170" height="170" rx="60" />
            <rect x="150" y="70" width="36" height="130" rx="18" />
            <rect x="192" y="40" width="36" height="150" rx="18" />
            <rect x="234" y="32" width="36" height="160" rx="18" />
            <rect x="276" y="55" width="36" height="140" rx="18" />
            <rect x="92" y="160" width="34" height="100" rx="17" transform="rotate(-35 109 210)" />
          </g>
          <g fill="#fff" fillOpacity=".6">
            <rect x="155" y="76" width="26" height="30" rx="10" />
            <rect x="197" y="46" width="26" height="30" rx="10" />
            <rect x="239" y="38" width="26" height="30" rx="10" />
            <rect x="281" y="61" width="26" height="30" rx="10" />
          </g>
          <g fill="none" stroke="url(#hg)" strokeWidth="4" strokeLinecap="round">
            <path d="M222 70V52h18" /><path d="M282 52h18v18" />
          </g>
        </svg>
      )}
      <div className="scanln" />
      <div className="chip glass" style={{ left: 14, top: 16 }}>Healthy<b>96%</b></div>
      <div className="chip glass" style={{ right: 14, top: 70, animationDelay: '-2s' }}>Disease<b>91%</b></div>
    </div>
  );
}

export default function AuthLayout({ children }) {
  return (
    <Container fluid className="auth-wrap">
      <Row className="align-items-center g-5 mx-auto" style={{ maxWidth: 1200 }}>
        <Col lg={6} className="order-2 order-lg-1">
          <div className="logo"><Logo /> {APP_NAME}</div>
          {/* The invisible "ghost" line reserves the full height, so the typing
              animation can't change the layout height and make the card shake. */}
          <h1 className="big big-grid">
            <span className="ghost" aria-hidden="true">{LEAD}{LONGEST}</span>
            <span className="live">{LEAD}<Typewriter /></span>
          </h1>
          <p className="text-secondary" style={{ maxWidth: '44ch' }}>
            Upload a photo of your hands and get ranked predictions with confidence scores.
            Every result is saved to your history.
          </p>
          <HeroPicture />
        </Col>
        <Col lg={6} className="order-1 order-lg-2">
          <div className="glass auth-card pop mx-auto">{children}</div>
        </Col>
      </Row>
    </Container>
  );
}
