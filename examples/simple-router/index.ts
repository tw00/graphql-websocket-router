/* eslint-disable import/no-relative-parent-imports */
import GraphQLWebsocketRouter from "../../src";
import { App as uWebSocketApp, DEDICATED_COMPRESSOR_3KB } from "uWebSockets.js";
import { readFileSync } from "fs";
import { resolve } from "path";

// const api = new GraphQLWebsocketRouter(
//   "https://rickandmortyapi.com/graphql",
//   readFileSync(resolve(__dirname, "./example-queries.graphql"), "utf-8")
// );

const api = new GraphQLWebsocketRouter(
  "ws://localhost:4000/graphql",
  readFileSync(resolve(__dirname, "../backend/queries.graphql"), "utf-8")
);

uWebSocketApp()
  .ws("/*", {
    idleTimeout: 8 * 4,
    maxBackpressure: 1024,
    maxPayloadLength: 512,
    compression: DEDICATED_COMPRESSOR_3KB,
    ...api.uWebSocketBehavior(),
  })
  .listen(9001, (listenSocket) => {
    if (listenSocket) {
      console.log("Listening to port 9001");
    }
  });
