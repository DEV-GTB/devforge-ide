import { useCallback, useEffect, useState } from 'react';
import { clearEvents as apiClear, listEvents, recordEvent } from '../api/visionClient';
import type { VisionEvent, VisionEventKind } from '../types/vision';

interface AddEventInput {
  kind: VisionEventKind;
  message: string;
  sourceUrl?: string;
  line?: number;
  column?: number;
  statusCode?: number;
}

/**
 * Owns the real browser-console / page-error event stream reported by the
 * preview bridge. "No errors captured" and "collection unavailable" are
 * distinct states: `unavailable` is only set when the backend cannot receive
 * events at all.
 */
export function useVisionEvents(sessionId: string | null) {
  const [events, setEvents] = useState<VisionEvent[]>([]);
  const [paused, setPaused] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [busy, setBusy] = useState(false);

  const refetch = useCallback(async () => {
    if (!sessionId) return;
    setBusy(true);
    try {
      const result = await listEvents(sessionId);
      setEvents(result.events);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setEvents([]);
      setUnavailable(false);
      return;
    }
    setPaused(false);
    void refetch();
  }, [sessionId, refetch]);

  const add = useCallback(
    async (input: AddEventInput) => {
      if (!sessionId || paused) return;
      try {
        await recordEvent(sessionId, input);
      } catch {
        setUnavailable(true);
      }
    },
    [sessionId, paused]
  );

  const flush = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const clear = useCallback(async () => {
    if (!sessionId) return;
    await apiClear(sessionId);
    setEvents([]);
  }, [sessionId]);

  return { events, paused, setPaused, unavailable, busy, add, flush, clear };
}