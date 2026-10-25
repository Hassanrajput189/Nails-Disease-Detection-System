import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext.jsx';
import ResultModal from '../components/ResultModal.jsx';

const API_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export default function Results() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user?.email) {
      setHist([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/analysis/${encodeURIComponent(user.email.trim().toLowerCase())}`
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 404) {
        setHist([]);
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to load prediction history.'
        );
      }

      const records = (data.analyses || []).map((item, index) => {
        const result = item.result || {};

        const preds = Object.entries(result.class_probabilities || {})
          .map(([label, probability]) => {
            const value = Number(probability);

            return {
              l: label.replaceAll('_', ' '),
              p: Number(
                (value <= 1 ? value * 100 : value).toFixed(2)
              ),
            };
          })
          .sort((a, b) => b.p - a.p);

        if (preds.length === 0 && result.predicted_category) {
          preds.push({
            l: result.predicted_category.replaceAll('_', ' '),
            p: Number(
              (Number(result.confidence || 0) * 100).toFixed(2)
            ),
          });
        }

        const originalImage = item.image?.url || '';

        const heatmapImage = item.heatmap
          ? item.heatmap.startsWith('data:')
            ? item.heatmap
            : `data:image/jpeg;base64,${item.heatmap}`
          : '';

        return {
          ...item,
          id: item.image?.publicId || String(index),
          name: item.filename || 'Nail image',
          at: item.createdAt || new Date().toISOString(),
          preds,
          img: originalImage || heatmapImage,
          th: '',
        };
      });

      setHist(records);      
    } catch (err) {
      setError(err.message || 'Unable to load history.');
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const remove = async () => {
    if (!toDelete || !user?.email || deleting) return;

    setDeleting(true);
    setError('');

        try {
      const params = new URLSearchParams({
        user_email: user.email.trim().toLowerCase(),
      });

      const response = await fetch(
        `${API_URL}/delete_analysis/${encodeURIComponent(toDelete)}?${params.toString()}`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || 'Unable to delete this result.'
        );
      }

      const deletedId = toDelete;

      setHist((previous) =>
        previous.filter((item) => item.id !== deletedId)
      );

      setOpen((previous) =>
        previous?.id === deletedId ? null : previous
      );

      setToDelete(null);
    } catch (err) {
      setError(err.message || 'Unable to delete this result.');
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
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

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}

          {error.toLowerCase().includes('session') ||
          error.toLowerCase().includes('log in') ? (
            <Button variant="link" onClick={() => nav('/login')}>
              Log in again
            </Button>
          ) : null}
        </div>
      )}

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

      {loading ? (
        <div className="empty glass">
          <p>Loading your prediction history...</p>
        </div>
      ) : hist.length === 0 ? (
        <div className="empty glass">
          <b>No results yet</b>

          <p className="text-secondary">
            Upload a nail image on the Predict page to see your AI analysis here.
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
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setOpen(item);
                  }
                }}
              >
                {item.img ? (
                  <img
                    src={item.img}
                    alt="Analyzed nail"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="d-flex align-items-center justify-content-center">
                    Nail image
                  </div>
                )}

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
                    setError('');
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
        onHide={() => {
          if (!deleting) setToDelete(null);
        }}
        centered
        contentClassName="glass-modal"
      >
        <Modal.Body className="text-center p-4">
          <h3>Delete this result?</h3>

          <p className="text-secondary">
            This will permanently delete the selected saved prediction.
          </p>

          <div className="d-flex gap-2">
            <Button
              variant="outline-light"
              className="w-100"
              disabled={deleting}
              onClick={() => setToDelete(null)}
            >
              Keep it
            </Button>

            <Button
              className="btn-grad w-100"
              disabled={deleting}
              onClick={()=>{
                remove(toDelete)
              }}
            >
              {deleting ? 'Deleting...' : 'Delete result'}
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}