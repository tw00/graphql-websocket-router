import { App, DEDICATED_COMPRESSOR_3KB, TemplatedApp } from "uWebSockets.js";
import { RouterMap, IInputMessage } from "./types";

// const app = SSLApp({
//   /* There are more SSL options, cut for brevity */
//   key_file_name: "misc/key.pem",
//   cert_file_name: "misc/cert.pem",
// });

function parseBuffer(buffer: ArrayBuffer): IInputMessage | null {
  try {
    return JSON.parse(Buffer.from(buffer).toString());
  } catch (error) {
    return null;
  }
}

function createSubscriptionHashStable(message: IInputMessage) {
  return `${message.operation}:${JSON.stringify(message.variables)}`;
}

// class SubscriptionManager {}

export function createSocketServer(router: RouterMap): TemplatedApp {
  const app = App();

  app.ws("/*", {
    /* There are many common helper features */
    idleTimeout: 8 * 4,
    maxBackpressure: 1024,
    maxPayloadLength: 512,
    compression: DEDICATED_COMPRESSOR_3KB,

    open: (ws) => {
      /* Let this client listen to all sensor topics */
      // ws.subscribe("home/sensors/#");
    },
    message: (ws, buffer, isBinary) => {
      if (isBinary) {
        ws.send(
          JSON.stringify({ status: "BINARY_NOT_SUPPORTED" }),
          isBinary,
          false
        );
      }

      /* You can do app.publish('sensors/home/temperature', '22C') kind of pub/sub as well */
      const message = parseBuffer(buffer);
      console.log("received message:", message);

      if (message?.method === "subscribe") {
        ws.subscribe(createSubscriptionHashStable(message));
      }

      if (message?.method === "query") {
        if (message.operation) {
          router[message.operation](message, (msg) =>
            ws.send(JSON.stringify(msg), isBinary, false)
          );
        }
      }
    },
    drain: (ws) => {
      return;
    },
    close: (ws, code, message) => {
      /* The library guarantees proper unsubscription at close */
    },
  });

  app.get("/*", (res) => {
    /* It does Http as well */
    res
      .writeStatus("200 OK")
      .writeHeader("IsExample", "Yes")
      .end("Hello there!");
  });

  return app;
}

/* istanbul ignore next */
// if (require.main === module) {
//   createSocketServer().listen(9001, (listenSocket) => {
//     if (listenSocket) {
//       console.log("Listening to port 9001");
//     }
//   });
// }
