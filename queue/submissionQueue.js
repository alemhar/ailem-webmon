// Submission queue module: sequential backend posting with batchId and toggle
import { BACKEND_ENDPOINT, BACKEND_BEARER_TOKEN, QUEUE_RETRY_INTERVAL_MS } from '../config.js';

let _queue = [];
let _submitting = false;
let _eventSeq = 0;
let _enabled = false;
let _batchId = typeof crypto?.randomUUID === 'function'
  ? crypto.randomUUID()
  : `batch_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
let _retryIntervalMs = QUEUE_RETRY_INTERVAL_MS;
let _retryTimerId = null;
let _lastAttemptAt = 0; // ms epoch of last attempt

let _persistCb = () => {};
export function setPersistCallback(fn) {
  _persistCb = typeof fn === 'function' ? fn : () => {};
}

export function restoreQueueState(state = {}) {
  if (Array.isArray(state.submissionQueue)) _queue = state.submissionQueue;
  if (typeof state.eventSeq === 'number') _eventSeq = state.eventSeq;
  if (typeof state.batchId === 'string') _batchId = state.batchId;
  if (typeof state.submissionEnabled === 'boolean') _enabled = state.submissionEnabled;
  if (typeof state.retryIntervalMs === 'number') setRetryIntervalMs(state.retryIntervalMs);
}

export function getQueueState() {
  return {
    submissionQueue: _queue,
    eventSeq: _eventSeq,
    batchId: _batchId,
    submissionEnabled: _enabled,
    retryIntervalMs: _retryIntervalMs
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

export function getRetryIntervalMs() {
  return _retryIntervalMs;
}

export function setRetryIntervalMs(ms) {
  const val = Number(ms);
  _retryIntervalMs = Number.isFinite(val) && val >= 0 ? val : 0;
  // Reset timer
  if (_retryTimerId) {
    try { clearInterval(_retryTimerId); } catch {}
    _retryTimerId = null;
  }
  if (_retryIntervalMs > 0) {
    _retryTimerId = setInterval(() => {
      if (_enabled && _queue.length > 0) {
        void processSubmissionQueue();
      }
    }, _retryIntervalMs);
  }
  try { _persistCb(); } catch {}
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
  // When retry is Off, only attempt automatically if this is the first item (avoid re-attempting a failed head)
  if (_retryIntervalMs === 0) {
    const now = Date.now();
    const cooldownMs = 1500; // avoid bursts; still surface a toast on user actions like reload
    if (_queue.length === 1 || (now - _lastAttemptAt) > cooldownMs) {
      void processSubmissionQueue();
    }
  } else {
    void processSubmissionQueue();
  }
}

export async function processSubmissionQueue() {
  if (_submitting) return;
  if (!_enabled) return;
  _submitting = true;
  try {
    while (_queue.length > 0) {
      const item = _queue[0];
      let ok = false;
      let status = undefined;
      let errorMessage = undefined;
      try {
        _lastAttemptAt = Date.now();
        const res = await fetch(BACKEND_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': BACKEND_BEARER_TOKEN
          },
          body: JSON.stringify(item)
        });
        status = res.status;
        ok = res.ok;
      } catch (_) {
        ok = false;
        errorMessage = (_ && _.message) ? _.message : 'Network error';
      }
      if (ok) {
        _queue.shift();
        try { _persistCb(); } catch {}
        try {
          chrome.runtime.sendMessage({
            type: 'SUBMISSION_STATUS',
            data: { ok: true, status, item: { eventType: item.eventType, seq: item.seq, batchId: item.batchId } }
          }).catch(() => {});
        } catch {}
      } else {
        try {
          chrome.runtime.sendMessage({
            type: 'SUBMISSION_STATUS',
            data: { ok: false, status, error: errorMessage, item: { eventType: item.eventType, seq: item.seq, batchId: item.batchId } }
          }).catch(() => {});
        } catch {}
        break;
      }
    }
  } finally {
    _submitting = false;
  }
}

export function startPeriodicRetry() {
  setRetryIntervalMs(_retryIntervalMs);
}
