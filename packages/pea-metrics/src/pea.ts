import { context, pea, peaKey } from "@speajus/pea";
import * as client from 'prom-client';
import { MetricsConfig } from "./MetricsConfig";
import { MetricService } from "./MetricService";


export const promClientPeaKey = peaKey<typeof client>("@pea/prometheus/metrics");

export const aggregatorRegistryKey = peaKey<
    InstanceType<typeof client.AggregatorRegistry<any>>>("@pea/prometheus/aggregator");

export const registerKey = peaKey<InstanceType<typeof client.Registry>>("@pea/prometheus/register");

export function register(ctx = context) {
    ctx.register(promClientPeaKey, client);
    ctx.register(MetricsConfig);
    ctx.register(MetricService);
    ctx.register(registerKey, () => new client.Registry());
    const metrics = ctx.resolve((config = pea(MetricsConfig), metricService = pea(MetricService)) => {
        ctx.onServiceAdded((...services) => {
            const tags = config.tags;
            for (const service of services) {
                if (tags?.length) {
                    if (service.tags.some(v => tags.includes(v))) {
                        metricService.withMetric(service);
                    }
                } else {
                    metricService.withMetric(service);
                }
            }
        });
    });
    console.log('started ' + metrics);
}