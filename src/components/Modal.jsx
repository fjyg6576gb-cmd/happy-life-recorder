import { createPortal } from 'react-dom'

function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>×</button>
        {title && <h3>{title}</h3>}
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal
