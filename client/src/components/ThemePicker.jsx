import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { store } from '../utils/storage.js';
import { confetti } from '../utils/confetti.js';

const THEMES = {
  Red: ['#d00a18', '#ff3b3b', '#ff6a3d', '229,9,20'],
  Ocean: ['#1e6bff', '#22d3ee', '#7c5cff', '30,107,255'],
  Emerald: ['#0aa86b', '#7dffc4', '#22d3ee', '10,168,107'],
  Purple: ['#7c5cff', '#ff5fa2', '#22d3ee', '124,92,255'],
  Sunset: ['#ff7a18', '#ffd166', '#ff3b3b', '255,122,24'],
};

function apply(name) {
  const [a, b, c, rgb] = THEMES[name];
  const r = document.documentElement.style;
  r.setProperty('--a', a); r.setProperty('--b', b); r.setProperty('--c', c);
  r.setProperty('--rgb', rgb);
  r.setProperty('--gb', `rgba(${rgb},.22)`);
  store.set('theme', name);
}

export function applySavedTheme() {
  const t = store.get('theme', 'Red');
  apply(THEMES[t] ? t : 'Red');
}

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(store.get('theme', 'Red'));
  const pick = (n) => { apply(n); setCurrent(n); confetti(); };

  return (
    <>
      <button className="pal" aria-label="Change theme color" onClick={() => setOpen(true)}>🎨</button>
      <Modal show={open} onHide={() => setOpen(false)} centered contentClassName="glass-modal">
        <Modal.Body className="text-center p-4">
          <h3>Pick your theme</h3>
          <p className="text-secondary">Colors change instantly across the whole app.</p>
          <div className="sws">
            {Object.entries(THEMES).map(([n, c]) => (
              <button key={n} title={n} aria-label={n}
                className={'sw' + (n === current ? ' on' : '')}
                style={{ background: `linear-gradient(135deg,${c[0]},${c[1]})` }}
                onClick={() => pick(n)} />
            ))}
          </div>
          <Button className="btn-grad w-100" onClick={() => setOpen(false)}>Done</Button>
        </Modal.Body>
      </Modal>
    </>
  );
}
