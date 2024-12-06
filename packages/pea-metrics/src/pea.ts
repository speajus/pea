import { context, Fn, pea, peaKey, serviceDesciptor } from "@speajus/pea";
import * as client from 'prom-client';
import { MetricsConfig } from "./MetricsConfig";
import { MetricService } from "./MetricService";
import { isFn } from "@speajus/pea/guards";

export const promClientPeaKey = peaKey<typeof client>("@pea/prometheus/metrics");

export const aggregatorRegistryKey = peaKey<client.AggregatorRegistry<any>>("@pea/prometheus/aggregator");

export function register(ctx = context) {
    ctx.register(promClientPeaKey, client);
    ctx.register(MetricsConfig);
    ctx.register(MetricService);
    ctx.register((config = pea(MetricsConfig), metricService = pea(MetricService)) => {
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
}