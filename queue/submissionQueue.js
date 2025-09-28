// Submission queue module: sequential backend posting with batchId and toggle
import { BACKEND_ENDPOINT, BACKEND_BEARER_TOKEN, QUEUE_RETRY_INTERVAL_MS } from '../config.js';

let _queue = [];
let _submitting = false;
let _eventSeq = 0;
let _enabled = false;
let _batchId = typeof crypto?.randomUUID === 'function'
  ? crypto.randomUUID()
  : `batch_${Date.now()}_${Math.floor(Math.random()*1e6)}`;

let _persistCb = () => {};
export function setPersistCallback(fn) {
  _persistCb = typeof fn === 'function' ? fn : () => {};
}

export function restoreQueueState(state = {}) {
  if (Array.isArray(state.submissionQueue)) _queue = state.submissionQueue;
  if (typeof state.eventSeq === 'number') _eventSeq = state.eventSeq;
  if (typeof state.batchId === 'string') _batchId = state.batchId;
  if (typeof state.submissionEnabled === 'boolean') _enabled = state.submissionEnabled;
}

export function getQueueState() {
  return {
    submissionQueue: _queue,
    eventSeq: _eventSeq,
    batchId: _batchId,
    submissionEnabled: _enabled
  };
}

export function getSubmissionEnabled() {
  return _enabled;
}

export function setSubmissionEnabled(v) {
  _enabled = !!v;
  try { _persistCb(); } catch {}
  if (_enabled) {
    void processSubmissionQueue();
  }
}

export function enqueueEvent(eventType, data) {
  const item = {
    batchId: _batchId,
    seq: ++_eventSeq,
    eventType,
    timestamp: new Date().toISOString(),
    data
  };
  _queue.push(item);
  try { _persistCb(); } catch {}
  void processSubmissionQueue();
}

export async function processSubmissionQueue() {
  if (_submitting) return;
  if (!_enabled) return;
  _submitting = true;
  try {
    while (_queue.length > 0) {
      const item = _queue[0];
      let ok = false;
      try {
        const res = await fetch(BACKEND_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': BACKEND_BEARER_TOKEN
          },
          body: JSON.stringify(item)
        });
        ok = res.ok;
      } catch (_) {
        ok = false;
      }
      if (ok) {
        _queue.shift();
        try { _persistCb(); } catch {}
      } else {
        break;
      }
    }
  } finally {
    _submitting = false;
  }
}

export function startPeriodicRetry() {
  setInterval(() => {
    if (_enabled && _queue.length > 0) {
      void processSubmissionQueue();
    }
  }, QUEUE_RETRY_INTERVAL_MS);
}
