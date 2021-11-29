# GraphQL WebSocket Router

GraphQL WebSocket Router allows you to expose an internal GraphQL API over Websocket without exposing the entire schema.

# Getting started

GraphQL Rest Router is available via NPM as `graphql-websocket-router`

```bash
npm install --save graphql-websocket-router
```

## Queries (`queries.gql`)

```gql
# GraphQL Subscription
subscription OnEvent($topic: String) {
  onEvent(topic: $topic) {
    timestamp
    message
  }
}

# GraphQL Live Query
query GetEpisodeById($id: ID!) {
  episode(id: $id) @live {
    id
    name
    air_date
  }
}
```

## Setting up the router/gateway with uWebSockets

```ts
import GraphQLWebsocketRouter from "graphql-websocket-router";
import { App as uWebSocketApp } from "uWebSockets.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const api = new GraphQLWebsocketRouter(
  "ws://localhost:4000/graphql",
  readFileSync(resolve(__dirname, "queries.gql"), "utf-8")
);

uWebSocketApp()
  .ws("/*", api.uWebSocketBehavior())
  .listen(9001, (listenSocket) => {
    if (listenSocket) {
      console.log("Listening on port 9001");
    }
  });
```

## WebSocket Protocol

```js
// Example: Query
>> { method: "query", operation: "GetEpisodeById", variables: { id: 1 } }
<< { status: "ok", data: { id: 1, name: "Episode One" } }

// Example: Subscription
>> { method: "subscribe", operation: "OnEvent", variables: { topic: 'all' } }
<< { status: "ok", data: { timestamp: 1, message: "hello" } }
<< { status: "update", data: { timestamp: 2, message: "world" } }
<< { status: "update", data: { timestamp: 3, message: "!" } }

// Example: Live Subscribe
>> { method: "subscribe", operation: "GetEpisodeById", variables: { id: 1 } }
<< { status: "ok", data: { id: 1, name: "Episode O" } }
<< { status: "update", data: { name: "Episode On" } }
<< { status: "update", data: { name: "Episode One" } }

// Example: Unsubscribe
>> { method: "unsubscribe", operation: "GetEpisodeById", variables: { id: 1 } }
<< { status: "ok" }

// Example: Error
>> { method: "query", operation: "GetEpisodeById", /* missing id */ }
<< { status: "error", error: { message: "id is missing" } }
```

# Supported backends

## Connecting to WebSocket backend

Supports **live queries**, **subscriptions**, **queries** and **mutations**.

```ts
// ...

const api = new GraphQLWebsocketRouter(
  "ws://localhost:4000/graphql",
  readFileSync(resolve(__dirname, "queries.gql"), "utf-8"),
  { enableDeltaPatching: false }
);

// ...
```

## Connecting to HTTP backend

Supports **queries** and **mutations** only.

```ts
// ...

const api = new GraphQLWebsocketRouter(
  "https://rickandmortyapi.com/graphql",
  readFileSync(resolve(__dirname, "queries.gql"), "utf-8")
);

// ...
```

# Client Examples

## Vanilla

```ts
const socket = new WebSocket("ws://localhost:9001");

socket.onopen = (event) => {
  // connection established
  socket.send(
    JSON.stringify({
      method: "subscribe",
      operation: "GetEpisodeById",
      variables: { id: 1 },
    })
  );
};

socket.onmessage = (event) => {
  const { status, data: document } = JSON.parse(event.data);
  console.log("[received]", document);
};

socket.onerror = (error) => {
  // handle error
};
```

## React Hook (TBD)

```ts
import { useLiveQuery } from "graphql-websocket-router/client/react";

export default function MyComponent() {
  const document = useLiveQuery({
    operation: "GetEpisodeById",
    variables: { id: 1 },
  });

  return <pre>{JSON.stringify(document)}</pre>;
}
```

## Next.js (TBD)

```ts
import {
  fetchLiveQuery,
  useLiveQuery,
} from "graphql-websocket-router/client/react";

export async function getStaticProps(context) {
  const { query: episodeQuery } = await fetchLiveQuery({
    operation: "GetEpisodeById",
    variables: { id: 1 },
  });

  return {
    props: { episodeQuery },
  };
}

export default function EpisodeDetails({ episodeQuery }) {
  const episode = useLiveQuery(episodeQuery);

  // Render episode...
}
```

# TODO

- [x] Support GraphQL Subscriptions
- [ ] Support Live Queries
- [ ] Support @defer/@stream directive
- [ ] Support SSE HTTP backend
- [ ] Support graphql-live-query-patch-jsondiffpatch
- [ ] React client library
