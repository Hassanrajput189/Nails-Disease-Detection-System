import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

/*
  Global success popup (theme-coloured).
  Usage:  const { showNotice } = useNotice();
          showNotice({ title: 'Welcome to', highlight: 'Nail Disease Detector', text: '...', button: 'Continue' });
*/
const NoticeContext = createContext({ showNotice: () => {} });
export const useNotice = () => useContext(NoticeContext);

const AUTO_CLOSE_MS = 4500;

export function NoticeProvider({ children }) {
  const [notice, setNotice] = useState(null);
  const [open, setOpen] = useState(false);
  const timer = useRef();

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
  }, []);

  const showNotice = useCallback((n) => {
    clearTimeout(timer.current);
    setNotice({ ...n, id: Date.now() });
    setOpen(true);
    timer.current = setTimeout(() => setOpen(false), n.autoClose ?? AUTO_CLOSE_MS);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <NoticeContext.Provider value={{ showNotice, closeNotice: close }}>
      {children}

      <Modal
        show={open}
        onHide={close}
        onExited={() => setNotice(null)}
        centered
        size="sm"
        contentClassName="glass-modal"
      >
        {notice && (
          <Modal.Body className="text-center p-4" key={notice.id}>
            <div className="notice-badge">
              <svg className="notice-check" viewBox="0 0 64 64" aria-hidden="true">
                <defs>
                  <linearGradient id="nt-g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: 'var(--a)' }} />
                    <stop offset="1" style={{ stopColor: 'var(--b)' }} />
                  </linearGradient>
                </defs>
                <circle cx="32" cy="32" r="27" />
                <path d="M20 33l9 9 16-18" />
              </svg>
            </div>

            <h3 className="mb-2">
              {notice.title}
              {notice.highlight && <> <span className="gt">{notice.highlight}</span></>}
            </h3>

            {notice.text && <p className="text-secondary mb-4">{notice.text}</p>}

            <Button className="btn-grad w-100" onClick={close}>
              {notice.button || 'Continue'}
            </Button>

            <div
              className="notice-bar"
              style={{ animationDuration: `${notice.autoClose ?? AUTO_CLOSE_MS}ms` }}
            />
          </Modal.Body>
        )}
      </Modal>
    </NoticeContext.Provider>
  );
}
