# [@speajus/pea](https://github.com/speajus/pea)

A lightweight, proxy-based Dependency Injection (DI) framework for Node.js with full TypeScript support.

[![npm version](https://badge.fury.io/js/@speajus%2Fpea.svg)](https://www.npmjs.com/package/@speajus/pea)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Documentation](https://speajus.github.io/pea)

## Features

- Lightweight nearly everything is done with `peaKey`, `context.register`, `context.resolve` and `pea`.
- Proxy-based lazy loading of dependencies
- No (runtime) dependencies (other than `node:async_hooks`)
- Type-safe and fully typed
- Not based on decorators.
- Constructor injection
- Factory injection
- Primitive injection
- Caching

## Dependencies and Requirements

This has no runtime dependencies. It also works with most modern JS runtimes.

## Installation

```bash
npm install @speajus/pea
```

or

```bash
yarn add @speajus/pea
```

## Basic Usage

Here's a simple example of how to use Injection:

```typescript
import { pea, context } from "@speajus/pea";

// Define a service
class DatabaseService {
  connect() {
    console.log("Connected to database");
  }
}

// Register the service
context.register(DatabaseService);

// Use the service
class UserService {
  constructor(private db = pea(DatabaseService)) {}

  getUsers() {
    this.db.connect();
    // ... fetch users
  }
}

const userService = context.resolve(UserService);
userService.getUsers(); // Outputs: Connected to database
```

## Roadmap

- Improve documentation and add more examples
- Finish AsyncLocal work for scope.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.
