# k6-tRPC

Run tests on tRPC endpoints using Grafana k6.

## Features

- ✏️ Intellisense suggestions
- 🗒️ Support for [SuperJSON](https://github.com/blitz-js/superjson)
- 🪶 Lightweight with no dependencies

## Quickstart

**1. Install `k6-trpc`.**

```shell
npm i -D k6-trpc
```

**2. Create your client with `createClient`.**

```typescript
import { createClient } from "k6-trpc";
import { type AppRouter } from "./server";

const client = createClient<AppRouter>("http://localhost:3000/api/trpc/");
```

**3. Start using your client.**

```typescript
const response = client.healthcheck.query();

check(response, {
  "is status 200": (res) => res.status === 200,
});
```

**4. Bundle your test.**

Refer to [k6-template-typescript](https://github.com/grafana/k6-template-typescript) on how to configure your bundler to emit `k6` compatible code.

Use the following regex to ensure that `k6-trpc` is bundled together in the output and is not treated as an external dependency.

```javascript
{
  // Other webpack configuration parameters.
  externals: /^(k6|https?\:\/\/)(\/.*)?(?!-trpc)/,
}
```

> Alternatively, refer to `webpack.config.js.example` for a sample webpack configuration.

## Configuration

`createClient` accepts a `transformer` argument which allows you to use `SuperJSON` or any other tRPC-compliant transformer.

```typescript
import superjson from "superjson";

const client = createClient<AppRouter>("http://localhost:3000/api/trpc/", superjson);
```

Both `query` and `mutate` accept an optional argument to provide request parameters such as custom headers or cookies.

```typescript
import { createOptions } from "k6-trpc";

const response = client.healthcheck.query(
  createOptions({
    cookies: {
      my_cookie: "hello world",
    },
  }),
);
```
