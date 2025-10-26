import React from 'react';
import { Toast } from 'react-bootstrap';

const CenteredToast = ({ show, onClose, message, variant = 'info', autohide = true, delay = 2000 }) => {
  return (
    <div className="position-fixed top-50 start-50 translate-middle p-3" style={{ zIndex: 1100, minWidth: 300 }}>
      <Toast bg={variant} onClose={onClose} show={show} delay={delay} autohide={autohide}>
        <Toast.Body className={variant === 'warning' ? 'text-dark' : 'text-white'}>
          {message}
        </Toast.Body>
      </Toast>
    </div>
  );
};

export default CenteredToast;
