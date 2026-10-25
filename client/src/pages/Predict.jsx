
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Alert } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import {
  predict,
  readFile,
  makeThumb,
  isHealthy,
} from '../utils/predict.js';
import { confetti } from '../utils/confetti.js';
import ResultModal from '../components/ResultModal.jsx';

const STEPS = [
  'Reading pixels',
  'Detecting objects',
  'Ranking predictions',
];

export default function Predict() {
  const { user } = useAuth();
  const nav = useNavigate();
  const inputRef = useRef();

  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async (file) => {
    if (!file || busy) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    if (!user?.email) {
      setError('Please log in before making a prediction.');
      return;
    }

    setError('');

    try {
      const src = await readFile(file);
      const th = await makeThumb(src);

      setBusy({ src, step: 0 });

      const progress = setInterval(() => {
        setBusy((current) =>
          current
            ? {
                ...current,
                step: Math.min(current.step + 1, 2),
              }
            : null
        );
      }, 900);

      try {
        const [prediction] = await Promise.all([
          predict(file, user.email),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);

        const record = {
          id: prediction.id || Date.now(),
          name: file.name,
          th,
          img: src,
          preds: prediction.preds,
          predicted_category: prediction.predicted_category,
          confidence: prediction.confidence,
          heatmap: prediction.heatmap,
          processing_time: prediction.processing_time,
          at: new Date().toISOString(),
        };

        setResult(record);

        // Celebrate only when the completed prediction is healthy.
        if (isHealthy(prediction.predicted_category)) {
          confetti();
        }
      } finally {
        clearInterval(progress);
        setBusy(null);
      }
    } catch (err) {
      setError(
        err?.message ||
          'Unable to analyze the image. Please try again.'
      );
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div className="page-in">
      <h2>Predict from an image</h2>

      <p className="text-secondary mb-4">
        Upload a nail image for AI analysis.
      </p>

      {error && (
        <Alert
          variant="danger"
          dismissible
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      <div
        className={'drop glass' + (over ? ' over' : '')}
        role="button"
        tabIndex={0}
        aria-disabled={!!busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!busy && e.key === 'Enter') {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);

          if (!busy) run(e.dataTransfer.files[0]);
        }}
      >
        <div className="ico">↑</div>
        <b className="fs-5">
          Drop an image here or click to upload
        </b>
        <p className="text-secondary mb-0">
          JPG, PNG or WebP
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        disabled={!!busy}
        onChange={(e) => run(e.target.files?.[0])}
      />

      <Modal
        show={!!busy}
        centered
        contentClassName="glass-modal"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body className="p-4">
          {busy && (
            <img
              src={busy.src}
              className="result-img mb-3"
              alt="Image being analyzed"
            />
          )}

          <h3 className="text-center">Analyzing…</h3>

          <div className="steps">
            {STEPS.map((step, index) => {
              const cls =
                busy && busy.step > index
                  ? 'ok'
                  : busy && busy.step === index
                    ? 'on'
                    : '';

              return (
                <div key={step} className={cls}>
                  <i>{cls === 'ok' ? '✓' : ''}</i>
                  {step}
                </div>
              );
            })}
          </div>
        </Modal.Body>
      </Modal>

      <ResultModal
        item={result}
        fresh
        onClose={() => setResult(null)}
        onViewAll={() => {
          setResult(null);
          nav('/results');
        }}
      />
    </div>
  );
}
