import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import CenteredToast from '../components/CenteredToast';

const ToastContext = createContext({
  showToast: (_message, _options) => {}
});

export const ToastProvider = ({ children }) => {
  const [queue, setQueue] = useState([]); // items: { message, variant, delay, autohide }
  const [visible, setVisible] = useState(false);

  const current = queue[0];

  useEffect(() => {
    if (current && !visible) {
      setVisible(true);
    }
  }, [current, visible]);

  const showToast = (message, options = {}) => {
    const { variant = 'info', delay = 2000, autohide = true } = options || {};
    setQueue((q) => [...q, { message, variant, delay, autohide }]);
  };

  const handleClose = () => {
    setVisible(false);
    // Remove the current toast from queue
    setQueue((q) => q.slice(1));
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {current && (
        <CenteredToast
          show={visible}
          onClose={handleClose}
          message={current.message}
          variant={current.variant}
          autohide={current.autohide}
          delay={current.delay}
        />
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastContext;
