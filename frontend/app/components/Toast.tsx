'use client';

import { useState, useEffect } from 'react';

export default function Toast({ message, type = 'success', show, onClose }) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const bgColor = type === 'success' ? 'bg-green-500' : 
                  type === 'error' ? 'bg-red-500' : 
                  type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-xl shadow-lg flex items-center space-x-3 min-w-80`}>
        <span className="text-2xl">
          {type === 'success' ? '✅' :
           type === 'error' ? '❌' :
           type === 'warning' ? '⚠️' : 'ℹ️'}
        </span>
        <span className="font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white hover:text-gray-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
