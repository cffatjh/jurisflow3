import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from './Icons';

type ConfirmVariant = 'danger' | 'default';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends Required<Pick<ConfirmOptions, 'message'>> {
  isOpen: boolean;
  title: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    title: 'Onay',
    message: '',
    confirmText: 'Tamam',
    cancelText: 'İptal',
    variant: 'default'
  });

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setState((s) => ({ ...s, isOpen: false }));
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setState({
        isOpen: true,
        title: options.title ?? 'Onay',
        message: options.message,
        confirmText: options.confirmText ?? 'Tamam',
        cancelText: options.cancelText ?? 'İptal',
        variant: options.variant ?? 'default'
      });
    });
  }, []);

  const value = useMemo<ConfirmContextValue>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.isOpen && (
        <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    state.variant === 'danger' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-700'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{state.title}</h3>
                </div>
              </div>
              <button
                onClick={() => close(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{state.message}</p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-2 justify-end">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                {state.cancelText}
              </button>
              <button
                onClick={() => close(true)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm ${
                  state.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};


