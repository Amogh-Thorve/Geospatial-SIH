import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { checkHealth } from '../services/api';

const ApiStatusContext = createContext({
  status: 'checking',
  health: null,
  error: null,
  refresh: () => {},
});

export function ApiStatusProvider({ children }) {
  const [status, setStatus] = useState('checking');
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setStatus('checking');
    setError(null);
    try {
      const body = await checkHealth();
      setHealth(body);
      setStatus(body.status === 'healthy' ? 'live' : 'degraded');
    } catch (err) {
      setHealth(null);
      setError(err.message);
      setStatus('offline');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ status, health, error, refresh }),
    [status, health, error, refresh],
  );

  return <ApiStatusContext.Provider value={value}>{children}</ApiStatusContext.Provider>;
}

export function useApiStatus() {
  return useContext(ApiStatusContext);
}
