import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ConfirmModal,
  type ConfirmOptions,
  type ConfirmTone,
} from './ConfirmModal';

type ConfirmRequest = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmApi = {
  /** Two-button confirm. Resolves true if confirmed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Single-button notice. */
  notice: (
    options: Omit<ConfirmOptions, 'dismissOnly' | 'cancelLabel'> & {
      tone?: ConfirmTone;
    },
  ) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmApi | null>(null);

export function ConfirmProvider({children}: {children: ReactNode}) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const queueRef = useRef<ConfirmRequest[]>([]);

  const presentNext = useCallback(() => {
    setRequest(queueRef.current[0] ?? null);
  }, []);

  const enqueue = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>(resolve => {
        queueRef.current.push({...options, resolve});
        if (queueRef.current.length === 1) {
          presentNext();
        }
      }),
    [presentNext],
  );

  const closeCurrent = useCallback(
    (result: boolean) => {
      const current = queueRef.current.shift();
      current?.resolve(result);
      presentNext();
    },
    [presentNext],
  );

  const api = useMemo<ConfirmApi>(
    () => ({
      confirm: options =>
        enqueue({
          tone: 'danger',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          ...options,
          dismissOnly: false,
        }),
      notice: async options => {
        await enqueue({
          tone: 'success',
          confirmLabel: 'OK',
          ...options,
          dismissOnly: true,
        });
      },
    }),
    [enqueue],
  );

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      {request ? (
        <ConfirmModal
          visible
          title={request.title}
          message={request.message}
          confirmLabel={request.confirmLabel}
          cancelLabel={request.cancelLabel}
          dismissOnly={request.dismissOnly}
          tone={request.tone}
          onConfirm={() => closeCurrent(true)}
          onCancel={() => closeCurrent(false)}
        />
      ) : null}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmApi {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
}
