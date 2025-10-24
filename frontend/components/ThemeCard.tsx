// frontend/components/ThemeCard.tsx
'use client';

import React from 'react';

interface ThemeCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  borderLeft?: boolean;
  style?: React.CSSProperties;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  borderLeft = false,
  style = {}
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          backgroundColor: 'var(--error-bg, #fee2e2)',
          borderColor: 'var(--error-color, #ef4444)',
          color: 'var(--error-text, #b91c1c)'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--warning-bg, #fef3c7)',
          borderColor: 'var(--warning-color, #f59e0b)',
          color: 'var(--warning-text, #92400e)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--success-bg, #dcfce7)',
          borderColor: 'var(--success-color, #10b981)',
          color: 'var(--success-text, #16a34a)'
        };
      case 'primary':
        return {
          backgroundColor: 'var(--primary-bg, var(--surface-color))',
          borderColor: 'var(--primary-color)',
          color: 'var(--text-color)'
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--background-color)',
          borderColor: 'var(--border-color, #e5e7eb)',
          color: 'var(--text-color)'
        };
      default:
        return {
          backgroundColor: 'var(--surface-color)',
          borderColor: 'var(--border-color, #e5e7eb)',
          color: 'var(--text-color)'
        };
    }
  };

  const variantStyles = getVariantStyles();
  const borderLeftStyle = borderLeft ? { borderLeft: `4px solid ${variantStyles.borderColor}` } : {};

  return (
    <div 
      className={`rounded-2xl border shadow-lg ${className}`}
      style={{
        ...variantStyles,
        ...borderLeftStyle,
        ...style
      }}
    >
      {children}
    </div>
  );
};

interface ThemeButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const ThemeButton: React.FC<ThemeButtonProps> = ({ 
  children, 
  onClick, 
  className = '', 
  variant = 'primary',
  disabled = false,
  style = {}
}) => {
  const getButtonStyles = () => {
    if (disabled) {
      return {
        backgroundColor: '#9ca3af',
        color: 'white',
        cursor: 'not-allowed'
      };
    }

    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--background-color)',
          color: 'var(--text-color)',
          border: '1px solid var(--border-color, #e5e7eb)'
        };
      case 'success':
        return {
          backgroundColor: 'var(--success-color, #10b981)',
          color: 'white'
        };
      case 'warning':
        return {
          backgroundColor: 'var(--warning-color, #f59e0b)',
          color: 'white'
        };
      case 'error':
        return {
          backgroundColor: 'var(--error-color, #ef4444)',
          color: 'white'
        };
      default:
        return {
          backgroundColor: 'var(--primary-color)',
          color: 'white'
        };
    }
  };

  const buttonStyles = getButtonStyles();

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 ${className}`}
      style={{
        ...buttonStyles,
        ...style
      }}
    >
      {children}
    </button>
  );
};