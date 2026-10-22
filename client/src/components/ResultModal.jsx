
import { useEffect, useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';

export default function ResultModal({ item, fresh, onClose, onViewAll }) {
  const [go, setGo] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  useEffect(() => {
    setGo(false);
    setShowHeatmap(false);

    if (!item) return;

    const timer = setTimeout(() => setGo(true), 80);
    return () => clearTimeout(timer);
  }, [item]);

  if (!item) return null;

  const top = item.preds?.[0];
  const category = item.predicted_category || top?.l || 'Unknown';
  const confidence = Number(
    item.confidence != null
      ? item.confidence * 100
      : top?.p ?? 0
  );

  const heatmapSrc = item.heatmap
    ? item.heatmap.startsWith('data:')
      ? item.heatmap
      : `data:image/png;base64,${item.heatmap}`
    : null;

  return (
    <Modal
      show={!!item}
      onHide={onClose}
      centered
      size="lg"
      contentClassName="glass-modal"
    >
      <Modal.Body className="text-center p-4">
        <img
          src={item.img || item.th}
          className="result-img mb-3"
          alt="Analyzed nail image"
        />

        <div className="ring">
          <svg width="130" height="130" viewBox="0 0 120 120">
            <defs>
              <linearGradient id="gr">
                <stop offset="0" style={{ stopColor: 'var(--a)' }} />
                <stop offset="1" style={{ stopColor: 'var(--b)' }} />
              </linearGradient>
            </defs>

            <circle className="bg" cx="60" cy="60" r="50" />

            <circle
              className="fg"
              cx="60"
              cy="60"
              r="50"
              style={{
                strokeDashoffset: go
                  ? 314 * (1 - Math.min(confidence, 100) / 100)
                  : 314,
              }}
            />
          </svg>

          <b>{confidence.toFixed(2)}%</b>
        </div>

        <h3 className="mt-2">
          {category.replaceAll('_', ' ')}
        </h3>

        <p className="text-secondary">
          {fresh ? 'Saved to your results.' : 'Saved prediction.'}
        </p>

        {item.processing_time != null && (
          <p className="text-secondary small">
            Processing time: {item.processing_time} seconds
          </p>
        )}

        <div className="text-start mt-4">
          <h5>Class probabilities</h5>

          {(item.preds || []).map((prediction) => (
            <div className="bar-row" key={prediction.l}>
              <div className="d-flex justify-content-between gap-2">
                <span>{prediction.l}</span>
                <b>{prediction.p.toFixed(2)}%</b>
              </div>

              <div className="track">
                <div
                  className="fill"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, prediction.p)
                    )}%`,
                    transition: go ? 'width 700ms ease' : 'none',
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {heatmapSrc && (
          <div className="mt-4">
            <Button
              variant="outline-light"
              onClick={() => setShowHeatmap((value) => !value)}
            >
              {showHeatmap ? 'Hide heatmap' : 'View AI heatmap'}
            </Button>

            {showHeatmap && (
              <div className="mt-3">
                <img
                  src={heatmapSrc}
                  className="result-img"
                  alt="AI Score-CAM heatmap"
                />
                <p className="text-secondary small mt-2">
                  Score-CAM visualization of image regions
                  that influenced the model.
                </p>
              </div>
            )}
          </div>
        )}

        <Alert variant="info" className="mt-3 text-start small">
          This is an AI prediction, not a confirmed medical diagnosis.
          Consult a qualified healthcare professional if you have concerns.
        </Alert>

        <div className="d-flex gap-2 mt-4">
          <Button
            variant="outline-light"
            className="w-100"
            onClick={onClose}
          >
            Close
          </Button>

          {fresh && (
            <Button
              className="btn-grad w-100"
              onClick={onViewAll}
            >
              View results
            </Button>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
