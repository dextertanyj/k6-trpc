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

## Configuration

`createClient` accepts a `transformer` argument which allows you to use `SuperJSON` or any other tRPC-compliant transformer.

```typescript
import superjson from "superjson";

const client = createClient<AppRouter>("http://localhost:3000/api/trpc/", superjson);
```

Both `query` and `mutate` accept an optional argument to provide request parameters such as custom headers or cookies.

```typescript
import { options as createOptions } from "k6-trpc";

const response = client.healthcheck.query(
  createOptions({
    cookies: {
      my_cookie: "hello world",
    },
  }),
);
```
