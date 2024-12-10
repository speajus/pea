import { context, pea, peaKey } from "@speajus/pea";
import * as client from "prom-client";
import { MetricsConfig } from "./MetricsConfig";
import { MetricService } from "./MetricService";

export const promClientPeaKey = peaKey<typeof client>(
  "@pea/prometheus/metrics",
);

export const registerKey = peaKey<InstanceType<typeof client.Registry>>(
  "@pea/prometheus/register",
);
export const metricServiceKey = peaKey<InstanceType<typeof MetricService>>(
  "@pea/prometheus/metricService",
);

export function register(ctx = context) {
  const p = ctx.register(promClientPeaKey, () => client);
  const r = ctx.register(registerKey, () => new client.Registry());
  const c = ctx.register(MetricsConfig);
  const m = ctx.register(
    metricServiceKey,
    MetricService,
    c.proxy,
    p.proxy,
    r.proxy,
  );
  ctx.resolve(
    (config: MetricsConfig, metricService: MetricService) => {
      ctx.onServiceAdded((...services) => {
        const tags = config.tags;
        for (const service of services) {
          if (tags?.length) {
            if (service.tags.some((v) => tags.includes(v))) {
              metricService.withMetric(service);
            }
          } else {
            metricService.withMetric(service);
          }
        }
      });
    },
    c.proxy,
    m.proxy,
  );
}
