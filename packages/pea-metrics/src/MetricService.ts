import { pea } from "@speajus/pea";
import { MetricsConfig } from "./MetricsConfig";
import { promClientPeaKey, registerKey } from "./pea";
import { ServiceDescriptor } from "@speajus/pea/ServiceDescriptor";
import * as promClient from "prom-client";

type Metric =
  | InstanceType<typeof promClient.Gauge>
  | InstanceType<typeof promClient.Counter>
  | InstanceType<typeof promClient.Summary>
  | InstanceType<typeof promClient.Histogram>;

export class MetricService {
  constructor(
    private config = pea(MetricsConfig),
    private promClient = pea(promClientPeaKey),
    private register = pea(registerKey),
  ) {
    if (config.includeUp !== false) {
      const prefix = config.collectDefaultMetrics?.prefix ?? this.config.prefix;
      const metrics: Record<string, Metric> = {};
      const up = (metrics.up = new promClient.Gauge({
        name: `${prefix}up`,
        help: "1 = up, 0 = not up",
        registers: [this.register],
      }));
      up.set(1);
    }
  }
  withMetric(v: ServiceDescriptor<any, any>) {
    const name = v.name ?? "";
    switch (name) {
      case "@pea/prometheus/metrics":
        return;
      case "":
      case "<anonymous>":
        console.warn(
          `can not monitor anonmous pea's please use peaKey, symbol with a description, or name the pea`,
        );
        return;
    }
    const metric = this.newMetric(`${this.config.prefix}${name}`);
    v.withInterceptors((invoke) => {
      const endTimer = metric.startTimer();
      let status = "success";
      try {
        return invoke.call(v);
      } catch (e) {
        status = "failed";
        throw e;
      } finally {
        endTimer({ status });
      }
    });
  }
  newMetric(oname: string) {
    const name = camelToSnakeCase(oname).replace(/[^a-zA-Z0-9_:]/g, "_").replace(/__/g, "_");

    const labelNames = ["status"];
    labelNames.push.apply(labelNames, Object.keys(this.config.labels));
    if (this.config.metricType === "summary") {
      return new this.promClient.Summary({
        name,
        help:
          "duration summary of method invocation labeled with: " +
          labelNames.join(", "),
        labelNames,
        percentiles: this.config.percentiles,
        maxAgeSeconds: this.config.maxAgeSeconds,
        ageBuckets: this.config.ageBuckets,
        registers: [this.register],
        pruneAgedBuckets: this.config.pruneAgedBuckets,
      });
    }

    if (this.config.metricType === "histogram") {
      return new this.promClient.Histogram({
        name,
        help:
          "duration histogram of method invocation labeled with: " +
          labelNames.join(", "),
        labelNames,
        buckets: this.config.buckets,
        registers: [this.register],
      });
    }
    throw new Error("metricType option must be histogram or summary");
  }
}
function camelToSnakeCase(str: string): string {
  return str
    .replace(/(.+?)([A-Z])/g, '$1_$2')
    .toLowerCase();
}