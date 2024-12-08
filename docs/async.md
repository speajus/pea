# Async Context

Pea provides powerful async context support using Node.js's AsyncLocalStorage, making it ideal for web applications where you need to maintain request-scoped dependencies.

## Setup

First, import the async extension:

```typescript
import "@speajus/pea/async";
```

This import is required to enable async context support. It extends the base context with async capabilities.

## Basic Usage

### Creating Scoped Dependencies

```typescript
import { context, pea, peaKey } from "@speajus/pea";
import "@speajus/pea/async";

// Define a key for your scoped value
const sessionKey = peaKey<Session>("session");

// Create a scoped handler
const requestScoped = context.scoped(sessionKey);

// Use in your service
class AuthService {
  constructor(private session = pea(sessionKey)) {}
  
  isAuthenticated() {
    return Boolean(this.session?.user);
  }
}
```

## Express Integration Example

Let's look at a real-world example using Express and Auth.js. You can find the complete example at [pea-express-authjs-example](https://github.com/speajus/pea/tree/main/examples/pea-express-authjs-example).

### Session Management

```typescript
import { context, pea } from "@speajus/pea";
import "@speajus/pea/async";
import { sessionPeaKey } from "./pea";
import {getSession} from "@authjs/express";

// Create scoped handler for session
const requestScoped = context.scoped(sessionPeaKey);

// Middleware to handle session
app.use("/*", async (req, res, next) => {
  const session = await getSession(req, pea(ExpressAuthConfigClass));
  if (!session?.user) {
    return res.redirect("/auth/signin");
  }

  requestScoped(next, session);
});
```



### Nested Scopes

```typescript
const userKey = peaKey<User>("user");
const tenantKey = peaKey<Tenant>("tenant");

const userScope = context.scoped(userKey);
const tenantScope = context.scoped(tenantKey);

app.use(async (req, res, next) => {
  const user = await getUser(req);
  userScope(async () => {
    const tenant = await getTenant(user);
    tenantScope(next, tenant);
  }, user);
});
```
