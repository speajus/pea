import { register } from '@speajus/pea-metrics';
import { pea } from '@speajus/pea';
register();

async function main(metric = pea(() => {
    console.log('I was called')
    return 1;
})) {
}

main().catch(e => console.error(e));

