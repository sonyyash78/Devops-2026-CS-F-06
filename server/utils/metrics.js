import client from 'prom-client';

const { collectDefaultMetrics, Counter, Histogram, Registry } = client;

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: 'pharmadesk_',
});

const httpRequestsTotal = new Counter({
  name: 'pharmadesk_http_requests_total',
  help: 'Total number of HTTP requests handled by the API.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

const httpRequestDuration = new Histogram({
  name: 'pharmadesk_http_request_duration_seconds',
  help: 'Duration of HTTP requests handled by the API in seconds.',
  labelNames: ['method', 'route'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [metricsRegistry],
});

export const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const matchedRoute = req.route?.path;
    const routePath = Array.isArray(matchedRoute) ? matchedRoute[0] : matchedRoute;
    const route = routePath ? `${req.baseUrl}${routePath}` : 'unmatched';
    const labels = {
      method: req.method,
      route,
    };

    httpRequestsTotal.inc({
      ...labels,
      status_code: String(res.statusCode),
    });
    httpRequestDuration.observe(labels, Number(process.hrtime.bigint() - startTime) / 1e9);
  });

  next();
};
