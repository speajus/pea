import { peaKey, context } from '@speajus/pea';

export const metricKey = peaKey<number>("mymetric");
context.register(metricKey, () => {
    return 1;
});
