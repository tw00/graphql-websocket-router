export function connect(onMessage?: (msg: any) => void): WebSocket {
  const socket = new WebSocket("ws://localhost:9001");

  socket.onopen = (event) => {
    console.log("[open] Connection established", event);
  };

  socket.onmessage = (event) => {
    console.log(`[message] Data received from server: ${event.data}`);
    onMessage && onMessage(event.data);
  };

  socket.onclose = (event) => {
    if (event.wasClean) {
      console.log(
        `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
      );
    } else {
      // e.g. server process killed or network down
      // event.code is usually 1006 in this case
      console.log("[close] Connection died");
    }
  };

  socket.onerror = (error) => {
    console.log(`[error] ${error}`);
  };

  // @ts-ignore
  window.uSocket = socket;
  return socket;
}
