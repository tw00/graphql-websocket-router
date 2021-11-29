# GraphQL WebSocket Router

GraphQL WebSocket Router allows you to expose an internal GraphQL API over Websocket without exposing the entire schema.

### Schema (`client-queries.gql`)

```graphql
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

### WebSocket Protocol

```js
// TODO: Why not infer from query?

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

# Getting started

```
npm install graphql-websocket-router
```

## Set up server connecting to WebSocket

Supports live queries, subscriptions, queries and mutations.

```ts
import GraphQLWebsocketRouter from "graphql-websocket-router";
import { App as uWebSocketApp } from "uWebSockets.js";
import { readFileSync } from "fs";
import { resolve } from "path";

const api = new GraphQLWebsocketRouter(
  "ws://localhost:4000/graphql",
  readFileSync(resolve(__dirname, "../backend/queries.graphql"), "utf-8"),
  { enableDeltaPatching: false }
);

uWebSocketApp()
  .ws("/*", {
    idleTimeout: 8 * 4,
    ...api.uWebSocketBehavior(),
  })
  .listen(9001, (listenSocket) => {
    if (listenSocket) {
      console.log("Listening to port 9001");
    }
  });
```

## Set up server connecting to HTTP

Supports queries and mutations only.

```ts
// ...

const api = new GraphQLWebsocketRouter(
  "https://rickandmortyapi.com/graphql",
  readFileSync(resolve(__dirname, "./example-queries.graphql"), "utf-8")
);

// ...
```

## Client Example

```ts
const socket = new WebSocket("ws://localhost:9001");

socket.onopen = (event) => {
  // Connection established
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

## React Hook

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

## Next.js

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
