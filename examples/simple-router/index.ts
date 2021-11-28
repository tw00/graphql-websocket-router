/* eslint-disable import/no-relative-parent-imports */
import { readFileSync } from "fs";
import { resolve } from "path";
import GraphQLWebsocketRouter from "../../src";
import { createSocketServer } from "../../src/usocket";

const clientQueries = readFileSync(
  resolve(__dirname, "./example-queries.graphql"),
  "utf-8"
);

const api = new GraphQLWebsocketRouter(
  "https://rickandmortyapi.com/graphql",
  clientQueries
);

const responder = api.mountAll().asMessageResponders();

createSocketServer(responder).listen(9001, (listenSocket) => {
  if (listenSocket) {
    console.log("Listening to port 9001");
  }
});
