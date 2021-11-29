import { useState } from "react";
import { connect } from "./socket";

let socket: WebSocket | undefined;

export default function App(): JSX.Element {
  const [temp, setTemp] = useState();
  const [operation, setOperation] = useState("GetHello");
  const [method, setMethod] = useState("query");

  function onConnect() {
    socket = connect((msg) => {
      setTemp(JSON.parse(msg));
    });
  }

  function onDisconnect() {
    socket?.close();
  }

  function onSend() {
    socket?.send(
      JSON.stringify({
        method,
        operation: operation,
        variables: {},
        // variables: { id: 1 },
      })
    );
  }

  return (
    <div className="app">
      <button type="button" onClick={onConnect}>
        CONNECT
      </button>
      <select
        value={operation}
        onChange={(event) => setOperation(event.target.value)}
      >
        <option value="GetHello">GetHello</option>
        <option value="GetHelloLive">GetHelloLive</option>
        <option value="OnGreetings">OnGreetings</option>
        <option value="GetEpisodeById">GetEpisodeById</option>
        <option value="GetEpisodes">GetEpisodes</option>
      </select>
      <select
        value={method}
        onChange={(event) => setMethod(event.target.value)}
      >
        <option value="subscribe">subscribe</option>
        <option value="unsubscribe">unsubscribe</option>
        <option value="query">query</option>
      </select>
      <button type="button" onClick={onSend}>
        SEND
      </button>
      <button type="button" onClick={onDisconnect}>
        DISCONNECT
      </button>
      <pre>{JSON.stringify(temp, null, 2)}</pre>
    </div>
  );
}
