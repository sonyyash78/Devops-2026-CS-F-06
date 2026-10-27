import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { metricsMiddleware, metricsRegistry } from '../utils/metrics.js';

test('records requests using route templates rather than request URLs', async () => {
  const req = {
    baseUrl: '/api/medicines',
    method: 'GET',
    path: '/api/medicines/123',
    route: { path: '/:id' },
  };
  const res = new EventEmitter();
  res.statusCode = 200;
  let nextCalled = false;

  metricsMiddleware(req, res, () => {
    nextCalled = true;
  });
  res.emit('finish');

  assert.equal(nextCalled, true);

  const metrics = await metricsRegistry.metrics();
  assert.match(metrics, /pharmadesk_http_requests_total\{method="GET",route="\/api\/medicines\/:id",status_code="200"\} 1/);
  assert.doesNotMatch(metrics, /route="[^"]*123/);
});

test('does not include metrics endpoint scrapes in HTTP request metrics', async () => {
  const req = {
    method: 'GET',
    path: '/metrics',
  };
  const res = new EventEmitter();

  metricsMiddleware(req, res, () => {});

  assert.equal(res.listenerCount('finish'), 0);
});
