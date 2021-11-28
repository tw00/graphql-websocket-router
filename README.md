# GraphQL Websocket Router

GraphQL Websocket Router allows you to expose an internal GraphQL API over Websocket without exposing the entire schema.

```js
import GraphQLWebsocketRouter from "graphql-websocket-router";

const clientQueries = fs.readFileSync("./clientQueries.gql", "utf-8");

const api = new GraphQLWebsocketRouter("http://graphqlurl.com", clientQueries);

api.listen(3000, () => {
  console.log("GraphQL Websocket Router is listening!");
});
```
