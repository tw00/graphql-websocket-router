// yarn add uWebSockets.js@uNetworking/uWebSockets.js#<tag>

import { App as uWebSocketApp } from "uWebSockets.js";
import { makeBehavior } from "graphql-ws/lib/use/uWebSockets";
import { schema } from "./schema";

uWebSocketApp()
  .ws("/graphql", makeBehavior({ schema }))
  .listen(4000, (listenSocket) => {
    if (listenSocket) {
      console.log("Listening to port 4000");
    }
  });
