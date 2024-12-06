# @speajus/pea-metrics-example
> This is an example of how you can use [prometheus](https://prometheus.io/) to monitor the inner workings of the bean contexts.  It measures how long invocations takes.  

## Requirements
 - Docker
 - pnpm/yarn/npm
 - node runtime

## Getting started
`prom-client` is a node package that sends metrics back to prometheus server.   It is a peerDependency of `@speajus/pea-metric`, so you will need to install it seperately.

### Install packages
```sh
$ npm install @speajus/pea-metric @speajus/pea
$ npm install prom-client
```

```sh
$ yarn add @speajus/pea-metric @speajus/pea
$ yarn add prom-client
```

```sh
$ pnpm add @speajus/pea-metric @speajus/pea
$ pnpm add prom-client

```
### Start you prometheus server
Included in the example is a prometheus demo server. Start it using docker.

```sh
$ pnpm run prometheus
```
### Run the example package
```sh
$ pnpm run example
```

### Open the prometheus dashboard
You should be able to see the published metrics at [http://localhost:9090](http://localhost:9090)