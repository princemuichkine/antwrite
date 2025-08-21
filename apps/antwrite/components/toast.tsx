'use client';

import React, { type ReactNode } from 'react';
import { toast as sonnerToast } from 'sonner';
import { CheckCircleFillIcon, WarningIcon } from './icons';

const iconsByType: Record<
  'success' | 'error' | 'info' | 'notice' | 'default',
  ReactNode
> = {
  success: (
    <div style={{ color: '#22c55e', transform: 'scale(1.25)' }}>
      <CheckCircleFillIcon />
    </div>
  ),
  error: (
    <div style={{ color: '#dc2626', transform: 'scale(1.25)' }}>
      <WarningIcon />
    </div>
  ),
  info: (
    <div style={{ color: '#f97316', transform: 'scale(1.25)' }}>
      <CheckCircleFillIcon />
    </div>
  ),
  notice: (
    <div style={{ color: '#0891b2', transform: 'scale(1.25)' }}>
      <CheckCircleFillIcon />
    </div>
  ),
  default: (
    <div style={{ color: '#000000', transform: 'scale(1.25)' }}>
      <CheckCircleFillIcon />
    </div>
  ),
};

interface ToastOptions {
  type?: 'success' | 'error' | 'info' | 'notice' | 'default';
  description: string;
}

export function toast({ type = 'info', description }: ToastOptions) {
  const isDark = document.documentElement.classList.contains('dark');

  switch (type) {
    case 'success':
      sonnerToast.success(description, {
        style: isDark
          ? {
              background: '#1a2e1f',
              color: '#86efac',
              border: '1px solid rgba(22, 101, 52, 0.3)',
            }
          : {
              background: '#dcfce7',
              color: '#166534',
              border: '1px solid rgba(187, 247, 208, 0.4)',
            },
      });
      break;
    case 'error':
      sonnerToast.error(description, {
        style: isDark
          ? {
              background: '#2d1a2d',
              color: '#f9a8d4',
              border: '1px solid rgba(190, 24, 93, 0.2)',
            }
          : {
              background: '#fce7f3',
              color: '#be185d',
              border: '1px solid rgba(249, 168, 212, 0.3)',
            },
      });
      break;
    case 'notice':
      sonnerToast(description, {
        style: isDark
          ? {
              background: '#1e2d33',
              color: '#67e8f9',
              border: '1px solid rgba(14, 116, 144, 0.2)',
            }
          : {
              background: '#cffafe',
              color: '#0e7490',
              border: '1px solid rgba(165, 243, 252, 0.3)',
            },
      });
      break;
    case 'default':
      sonnerToast(description, {
        style: isDark
          ? {
              background: '#242424',
              color: '#f1f5f9',
              border: '1px solid #1f1f1f',
            }
          : {
              background: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
            },
      });
      break;
    default:
      sonnerToast(description, {
        style: isDark
          ? {
              background: '#242424',
              color: '#f1f5f9',
              border: '1px solid #1f1f1f',
            }
          : {
              background: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
            },
      });
  }
}

function Toast(props: ToastProps) {
  const { id, type, description } = props;

  const getToastStyle = (
    toastType: 'success' | 'error' | 'info' | 'notice' | 'default',
  ) => {
    const isDark = document.documentElement.classList.contains('dark');

    switch (toastType) {
      case 'success':
        return isDark
          ? {
              backgroundColor: '#1a2e1f',
              color: '#86efac',
              border: '1px solid rgba(22, 101, 52, 0.3)',
            }
          : {
              backgroundColor: '#dcfce7',
              color: '#166534',
              border: '1px solid rgba(187, 247, 208, 0.4)',
            };
      case 'error':
        return isDark
          ? {
              backgroundColor: '#2d1a2d',
              color: '#f9a8d4',
              border: '1px solid rgba(190, 24, 93, 0.2)',
            }
          : {
              backgroundColor: '#fce7f3',
              color: '#be185d',
              border: '1px solid rgba(249, 168, 212, 0.3)',
            };
      case 'notice':
        return isDark
          ? {
              backgroundColor: '#1e2d33',
              color: '#67e8f9',
              border: '1px solid rgba(14, 116, 144, 0.2)',
            }
          : {
              backgroundColor: '#cffafe',
              color: '#0e7490',
              border: '1px solid rgba(165, 243, 252, 0.3)',
            };
      case 'default':
        return isDark
          ? {
              backgroundColor: '#242424',
              color: '#f1f5f9',
              border: '1px solid #1f1f1f',
            }
          : {
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
            };
      default:
        return isDark
          ? {
              backgroundColor: '#242424',
              color: '#f1f5f9',
              border: '1px solid #1f1f1f',
            }
          : {
              backgroundColor: '#f8fafc',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
            };
    }
  };

  const toastStyle = getToastStyle(type);

  return (
    <div className="flex w-full toast-mobile:w-[356px] justify-center">
      <div
        data-testid="toast"
        key={id}
        className="p-3 rounded-sm w-full toast-mobile:w-fit flex flex-row gap-2 items-center"
        style={toastStyle}
      >
        <div
          data-type={type}
          style={{
            color: toastStyle.color,
            fontSize: '20px',
            minWidth: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        >
          {iconsByType[type] || (
            <span style={{ color: 'red', fontSize: '16px' }}>
              No icon for: {type}
            </span>
          )}
        </div>
        <div className="text-sm">{description}</div>
      </div>
    </div>
  );
}

interface ToastProps {
  id: string | number;
  type: 'success' | 'error' | 'info' | 'notice' | 'default';
  description: string;
}
