'use client';
import { useState } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  requireMatch?: string;
}

export default function ConfirmDialog({ isOpen, message, onConfirm, onCancel, requireMatch }: ConfirmDialogProps) {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const isMatchRequired = !!requireMatch;
  const isMatchMet = !isMatchRequired || inputValue === requireMatch;

  const handleCancel = () => {
    setInputValue('');
    onCancel();
  };

  const handleConfirm = () => {
    if (isMatchMet) {
      setInputValue('');
      onConfirm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Confirm Delete</h3>
            <p className="text-sm text-gray-400 mt-0.5">{message}</p>
          </div>
        </div>
        
        {isMatchRequired && (
          <div className="mb-5 mt-2 bg-gray-800/50 p-4 rounded-xl border border-gray-800">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Please type <span className="text-white font-bold select-all">&quot;{requireMatch}&quot;</span> to confirm.
            </label>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={requireMatch}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isMatchMet}
            className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
