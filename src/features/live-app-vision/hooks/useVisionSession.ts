import { useCallback, useEffect, useState } from 'react';
import {
  connectPreview as apiConnect,
  disconnectPreview as apiDisconnect,
  getCapabilities,
  reloadPreview as apiReload,
  VisionApiError,
} from '../api/visionClient';
import type { PreviewInfo, VisionCapabilities } from '../types/vision';

export function useVisionSession() {
  const [session, setSession] = useState<PreviewInfo | null>(null);
  const [capabilities, setCapabilities] = useState<VisionCapabilities | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCapabilities = useCallback(async () => {
    try {
      const result = await getCapabilities();
      setCapabilities(result.capabilities);
    } catch {
      setError('Could not reach the local vision service.');
    }
  }, []);

  useEffect(() => {
    void loadCapabilities();
  }, [loadCapabilities]);

  useEffect(() => {
    return () => {
      // The lifecycle owner (VisionWorkspace) explicitly disconnects on unmount.
    };
  }, []);

  const connect = useCallback(
    async (url: string, viewport?: { width: number; height: number }) => {
      setBusy(true);
      setError(null);
      try {
        const result = await apiConnect(url, viewport);
        setSession(result.session);
        void loadCapabilities();
        return result.session;
      } catch (err) {
        const message =
          err instanceof VisionApiError ? err.message : 'Connection failed.';
        setError(message);
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [loadCapabilities]
  );

  const disconnect = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      await apiDisconnect(session.sessionId);
      setSession(null);
    } catch (err) {
      setError(err instanceof VisionApiError ? err.message : 'Disconnect failed.');
      throw err;
    } finally {
      setBusy(false);
    }
  }, [session]);

  const reload = useCallback(async () => {
    if (!session) return null;
    setBusy(true);
    setError(null);
    try {
      const result = await apiReload(session.sessionId);
      setSession(result.session);
      return result.session;
    } catch (err) {
      setError(err instanceof VisionApiError ? err.message : 'Reload failed.');
      return null;
    } finally {
      setBusy(false);
    }
  }, [session]);

  return { session, capabilities, busy, error, connect, disconnect, reload };
}