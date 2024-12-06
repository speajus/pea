import { context, isPeaKey, pea, peaKeyName, serviceSymbol } from "@speajus/pea";
import { MetricsConfig } from "./MetricsConfig";
import { promClientPeaKey } from "./pea";
import { ServiceDescriptor } from "@speajus/pea/ServiceDescriptor";
import * as promClient from "prom-client";
type Metric = InstanceType<typeof promClient.Gauge> |
    InstanceType<typeof promClient.Counter> |
    InstanceType<typeof promClient.Summary> |
    InstanceType<typeof promClient.Histogram>;

export class MetricService {
    constructor(private config = pea(MetricsConfig), private promClient = pea(promClientPeaKey)) {


        if (config.includeUp !== false) {
            const prefix = config.collectDefaultMetrics?.prefix ?? ''
            const metrics: Record<string, Metric> = {};
            const up = metrics.up = new promClient.Gauge({
                name: `${prefix}up`,
                help: '1 = up, 0 = not up',
                registers: [promClient.register]
            });
            up.set(1);
        }
    }
    withMetric(v: ServiceDescriptor<any, any>) {
        const name = isPeaKey(v[serviceSymbol]) ? peaKeyName(v[serviceSymbol] as any) : String(v[serviceSymbol]);

        const metric = this.newMetric(name);

        v.withInterceptors((invoke) => {
            const endTimer = metric.startTimer();
            try {
                const result = invoke.call(v);
                return result;
            } finally {
                endTimer();
            }
        });

    }
    newMetric(name: string) {
        const labels = ['invoke'];
        labels.push.apply(labels, Object.keys(this.config.labels));
        if (this.config.metricType === 'summary') {
            return new this.promClient.Summary({
                name,
                help: 'duration summary of method invocation labeled with: ' + labels.join(', '),
                labelNames: labels,
                percentiles: this.config.percentiles,
                maxAgeSeconds: this.config.maxAgeSeconds,
                ageBuckets: this.config.ageBuckets,
                registers: [this.promClient.register],
                pruneAgedBuckets: this.config.pruneAgedBuckets
            });

        }

        if (this.config.metricType === 'histogram') {
            return new this.promClient.Histogram({
                name,
                help: 'duration histogram of method invocation labeled with: ' + labels.join(', '),
                labelNames: labels,
                buckets: this.config.buckets,
                registers: [this.promClient.register],

            });

        }
        throw new Error('metricType option must be histogram or summary');

    }
}
