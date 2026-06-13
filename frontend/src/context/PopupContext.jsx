import { createContext, useContext, useState, useCallback } from 'react';
import '../css/popup.css';

const PopupContext = createContext(null);

export function PopupProvider({ children }) {
  const [popup, setPopup] = useState({
    isOpen: false,
    type: 'alert', // 'alert' or 'confirm'
    title: '',
    message: '',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel'
  });

  const showAlert = useCallback((message, title = 'Alert') => {
    setPopup({
      isOpen: true,
      type: 'alert',
      title,
      message,
      confirmText: 'OK',
      onConfirm: () => closePopup(),
    });
  }, []);

  const showConfirm = useCallback((message, onConfirm, title = 'Confirm', options = {}) => {
    setPopup({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      onConfirm: () => {
        if (onConfirm) onConfirm();
        closePopup();
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        closePopup();
      }
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopup(prev => ({ ...prev, isOpen: false }));
  }, []);

  return (
    <PopupContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      
      {popup.isOpen && (
        <div className="popup-overlay active">
          <div className="popup-content glass-effect">
            {popup.title && <h3 className="popup-title">{popup.title}</h3>}
            <p className="popup-message">{popup.message}</p>
            
            <div className="popup-actions">
              {popup.type === 'confirm' && (
                <button className="btn btn-outline" onClick={popup.onCancel}>
                  {popup.cancelText}
                </button>
              )}
              <button className="btn btn-primary" onClick={popup.onConfirm}>
                {popup.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
};
