# Metrics Plugin

The `@speajus/pea-metrics` plugin provides Prometheus metrics integration for your Pea applications, offering automatic service monitoring and custom metrics collection.

## Installation

```bash
npm install @speajus/pea-metrics prom-client
```

Note: `prom-client` is a peer dependency and must be installed separately.

## Quick Start

### 1. Basic Setup

```typescript
import { apply } from '@speajus/pea-metrics';
import express from 'express';

const app = express();
apply(app);
```

This will:
- Start a metrics server on port 9100 (configurable)
- Expose metrics at `/metrics` endpoint
- Begin collecting default metrics

### 2. Configuration

Configure the metrics through environment variables or the `MetricsConfig` class:

```typescript
import { MetricsConfig, context } from '@speajus/pea-metrics';

context.register(MetricsConfig, new MetricsConfig({
    port: 9464,
    path: '/metrics',
    host: 'localhost',
    prefix: 'app_',
    metricType: 'summary',
    percentiles: [0.5, 0.75, 0.95, 0.98, 0.99],
    maxAgeSeconds: 600
}));
```

Environment variables:
- `METRICS_PORT` (default: "9464")
- `METRICS_PATH` (default: "/metrics")
- `METRICS_HOST` (default: "localhost")
- `METRICS_PREFIX` (default: "pea_")
- `METRICS_TIMEOUT` (default: "1000")
- `METRICS_LABELS` (default: "{}")

### 3. Custom Metrics

```typescript
import { pea } from '@speajus/pea';
import { promClientPeaKey } from '@speajus/pea-metrics';

class CustomMetricsService {
    constructor(private prometheus = pea(promClientPeaKey),  register = pea(registerKey)) {
        this.requestCounter = new prometheus.Counter({
            name: 'http_requests_total',
            help: 'Total HTTP requests',
            labelNames: ['method', 'status'],
            registers: [register]
        });
    }

    recordRequest(method: string, status: number) {
        this.requestCounter.inc({ method, status });
    }
}
```

## Automatic Service Monitoring

The plugin automatically monitors registered services:

```typescript
import { MetricsConfig } from '@speajus/pea-metrics';

// Monitor specific services
context.register(MetricsConfig, {
    tags: [userServiceKey, authServiceKey]
});
```

This creates metrics for:
- Invocation duration
- Success/failure counts
- Active requests

## API Reference

### Keys

```typescript
import { promClientPeaKey, registerKey } from '@speajus/pea-metrics';

// Access Prometheus client
const prometheus = pea(promClientPeaKey);

// Access metrics registry
const registry = pea(registerKey);
```

### MetricService

Core service for managing metrics:

```typescript
import { MetricService } from '@speajus/pea-metrics';

class CustomService {
    constructor(private metrics = pea(MetricService)) {
        // Access metrics functionality
    }
}
```

### Express Middleware

```typescript
import { middleware } from '@speajus/pea-metrics';
import express from 'express';

const app = express();
app.use('/metrics', middleware());
```

## Best Practices

1. **Naming Conventions**
   ```typescript
   // Good - Clear, descriptive names
   const requestDuration = new prometheus.Histogram({
       name: 'http_request_duration_seconds',
       help: 'HTTP request duration in seconds'
   });

   // Bad - Unclear naming
   const metric = new prometheus.Counter({
       name: 'x',
       help: 'some metric'
   });
   ```

2. **Label Usage**
   ```typescript
   // Good - Relevant labels
   counter.inc({ 
       method: 'GET', 
       status: 200, 
       path: '/api/users' 
   });

   // Bad - Too many labels
   counter.inc({ 
       method: 'GET',
       status: 200,
       path: '/api/users',
       user: 'john',  // Too granular
       timestamp: Date.now()  // Don't use time as label
   });
   ```

3. **Metric Types**
   - Use `Counter` for values that only increase
   - Use `Gauge` for values that can go up and down
   - Use `Histogram` for measuring durations and sizes
   - Use `Summary` for calculating quantiles

## Example: Complete Setup

```typescript
import { context, pea } from '@speajus/pea';
import { 
    MetricsConfig, 
    MetricService, 
    promClientPeaKey 
} from '@speajus/pea-metrics';
import express from 'express';

// Configure metrics
context.register(MetricsConfig, {
    port: 9464,
    prefix: 'myapp_',
    tags: [userServiceKey, authServiceKey]
});

// Create custom metrics
class ApiMetrics {
    constructor(private prometheus = pea(promClientPeaKey)) {
        this.requestDuration = new prometheus.Histogram({
            name: 'api_request_duration_seconds',
            help: 'API request duration',
            labelNames: ['method', 'path', 'status'],
            buckets: [0.1, 0.5, 1, 2, 5]
        });
    }

    recordRequest(method: string, path: string, status: number, duration: number) {
        this.requestDuration.observe({ method, path, status }, duration);
    }
}

// Setup Express app
const app = express();
apply(app);

// Start server
app.listen(3000, () => {
    console.log('Server running with metrics at http://localhost:9464/metrics');
});
```

## Prometheus Configuration

Example `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'pea-app'
    static_configs:
      - targets: ['localhost:9464']
    scrape_interval: 15s
```

## Testing

The plugin provides utilities for testing metrics:

```typescript
import { context } from '@speajus/pea';
import { registerKey } from '@speajus/pea-metrics';

describe('Metrics', () => {
    it('should record metrics', async () => {
        const registry = context.resolve(registerKey);
        const metrics = await registry.metrics();
        expect(metrics).toContain('http_requests_total');
    });
});
```
