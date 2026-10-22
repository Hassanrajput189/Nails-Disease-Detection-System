
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import { store } from '../utils/storage.js';
import ResultModal from '../components/ResultModal.jsx';

export default function Results() {
  const { user } = useAuth();
  const nav = useNavigate();

  const key = `hist:${user?.email || ''}`;

  const [hist, setHist] = useState(() => store.get(key, []));
  const [open, setOpen] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const remove = () => {
    const next = hist.filter((item) => item.id !== toDelete);
    store.set(key, next);
    setHist(next);
    setToDelete(null);
  };

  const getTopPrediction = (item) => {
    if (!item.preds?.length) return null;

    return [...item.preds].sort((a, b) => b.p - a.p)[0];
  };

  const avg =
    hist.length > 0
      ? (
          hist.reduce((total, item) => {
            const top = getTopPrediction(item);
            return total + (top?.p || 0);
          }, 0) / hist.length
        ).toFixed(2) + '%'
      : '–';

  const counts = {};

  hist.forEach((item) => {
    const top = getTopPrediction(item);
    if (top) {
      counts[top.l] = (counts[top.l] || 0) + 1;
    }
  });

  const common =
    Object.keys(counts).length > 0
      ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
      : '–';

  return (
    <div className="page-in">
      <h2>Your results</h2>

      <p className="text-secondary mb-4">
        Your saved AI predictions and analysis history.
      </p>

      <Row className="g-3 mb-4">
        {[
          ['Predictions', hist.length],
          ['Avg. confidence', avg],
          ['Most common', common.replaceAll('_', ' ')],
        ].map(([label, value]) => (
          <Col xs={12} md={4} key={label}>
            <div className="stat glass">
              <b>{value}</b>
              <span>{label}</span>
            </div>
          </Col>
        ))}
      </Row>

      {hist.length === 0 ? (
        <div className="empty glass">
          <b>No results yet</b>
          <p className="text-secondary">
            Upload a nail image on the Predict page to see your AI
            analysis here.
          </p>
          <Button className="btn-grad" onClick={() => nav('/')}>
            Predict an image
          </Button>
        </div>
      ) : (
        <div className="d-grid gap-3">
          {hist.map((item, index) => {
            const top = getTopPrediction(item);

            if (!top) return null;

            return (
              <div
                key={item.id}
                className="row-item glass pop"
                style={{
                  animationDelay: `${Math.min(index * 70, 500)}ms`,
                  cursor: 'pointer',
                }}
                role="button"
                tabIndex={0}
                onClick={() => setOpen(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') setOpen(item);
                }}
              >
                <img
                  src={item.th || item.img}
                  alt="Analyzed nail"
                />

                <div className="flex-grow-1 text-truncate">
                  <b className="d-block">
                    {top.l.replaceAll('_', ' ')}
                  </b>

                  <small className="text-secondary">
                    {item.name} ·{' '}
                    {new Date(item.at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </small>
                </div>

                <span className="pill-badge">
                  {Number(top.p).toFixed(2)}%
                </span>

                <button
                  type="button"
                  className="x"
                  aria-label="Delete result"
                  onClick={(event) => {
                    event.stopPropagation();
                    setToDelete(item.id);
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ResultModal
        item={open}
        onClose={() => setOpen(null)}
      />

      <Modal
        show={toDelete !== null}
        onHide={() => setToDelete(null)}
        centered
        contentClassName="glass-modal"
      >
        <Modal.Body className="text-center p-4">
          <h3>Delete this result?</h3>

          <p className="text-secondary">
            This removes the prediction from your local history.
          </p>

          <div className="d-flex gap-2">
            <Button
              variant="outline-light"
              className="w-100"
              onClick={() => setToDelete(null)}
            >
              Keep it
            </Button>

            <Button
              className="btn-grad w-100"
              onClick={remove}
            >
              Delete
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
