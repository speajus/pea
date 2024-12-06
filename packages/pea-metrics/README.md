
# @speajus/pea-prom

A Prometheus metrics extension for [@speajus/pea](https://github.com/speajus/pea), providing easy integration of Prometheus monitoring into your Pea-based applications.

## Features

- 🔍 Easy integration with Prometheus
- 📊 Pre-configured metrics collectors
- 🎯 Type-safe metric registration
- 🔄 Automatic metric aggregation
- 🪝 Built-in middleware support
- 🎛️ Configurable default metrics

## Installation

```bash
npm install @speajus/pea-prom prom-client
```

```bash
pnpm add @speajus/pea-prom prom-client
```

```bash
yarn add @speajus/pea-prom prom-client
```

Note: `prom-client` is a peer dependency and must be installed separately.

## Quick Start

```typescript
import { pea, context } from '@speajus/pea';
import { promClientPeaKey } from '@speajus/pea-prom';

// Get the Prometheus client
const prometheus = pea(promClientPeaKey);

// Create and register metrics
const httpRequestsTotal = new prometheus.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'status']
});

// Use in your service
class MetricsService {
    constructor(private prometheus = pea(promClientPeaKey)) {
        // Initialize metrics
    }

    recordRequest(method: string, status: number) {
        httpRequestsTotal.inc({ method, status });
    }
}
```

## Running Prometheus

A Docker configuration is included for local development. To start Prometheus:

```bash
npm run prometheus
```

This will start Prometheus with the included configuration, accessible at `http://localhost:9090`.

## Configuration

### prometheus.yml

The default Prometheus configuration is set to scrape metrics from `localhost:9464`. You can modify the configuration in `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s # Set the scrape interval to every 15 seconds. Default is every 1 minute.
  evaluation_interval: 15s # Evaluate rules every 15 seconds. The default is every 1 minute.
alerting:
  alertmanagers:
    - static_configs:
        - targets:
rule_files:
scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]
```

### Custom Metrics

```typescript
import { pea } from '@speajus/pea';
import { promClientPeaKey } from '@speajus/pea-prom';

class CustomMetricsService {
    private prometheus = pea(promClientPeaKey);
    
    private requestDuration = new this.prometheus.Histogram({
        name: 'http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route'],
        buckets: [0.1, 0.5, 1, 2, 5]
    });

    recordDuration(method: string, route: string, duration: number) {
        this.requestDuration.observe({ method, route }, duration);
    }
}
```

## Express Middleware Example

```typescript
import { pea } from '@speajus/pea';
import { promClientPeaKey } from '@speajus/pea-prom';
import express from 'express';

const app = express();
const prometheus = pea(promClientPeaKey);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
});

// Middleware to collect metrics
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        // Record metrics here
    });
    next();
});
```

## API Reference

### Keys

- `promClientPeaKey`: Access the Prometheus client instance
- `aggregatorRegistryKey`: Access the metrics aggregator registry

### Types

The package exports all types from `prom-client` for type-safe metric creation.

## Development

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Start Prometheus
pnpm run docker
```

## Testing

```bash
pnpm test
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
