import React from 'react';

/**
 * Reusable modal component
 * Props:
 *  - open: boolean
 *  - title: string | ReactNode
 *  - onClose: function
 *  - children: modal body
 *  - footer: optional custom footer (if omitted default Cancel/Confirm buttons shown)
 *  - confirmText: text for confirm button
 *  - onConfirm: handler for confirm
 *  - confirmDisabled: boolean
 *  - loading: boolean (disables buttons & shows spinner)
 *  - size: 'sm' | 'md' | 'lg'
 */
export default function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  confirmText = 'Confirm',
  onConfirm,
  confirmDisabled,
  loading,
  size = 'md'
}) {
  if (!open) return null;
  const widthClass = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={`w-full ${widthClass} bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-4 animate-fadeIn`}>        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button disabled={loading} onClick={onClose} className="text-gray-400 hover:text-white disabled:opacity-50">✕</button>
        </div>
        <div className="text-sm text-gray-200 space-y-3">
          {children}
        </div>
        {footer ? footer : (
          <div className="flex justify-end gap-2 pt-2">
            <button disabled={loading} onClick={onClose} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white disabled:opacity-50">Cancel</button>
            {onConfirm && (
              <button disabled={confirmDisabled || loading} onClick={onConfirm} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm text-white flex items-center gap-2">
                {loading && <span className="animate-spin h-4 w-4 border-2 border-white/40 border-t-white rounded-full"></span>}
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
