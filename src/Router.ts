/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios, { AxiosInstance } from "axios";
import {
  parse,
  DocumentNode,
  getOperationAST,
  separateOperations,
} from "graphql";
import { Client as GraphQLWebSocketClient, createClient } from "graphql-ws";
import * as ws from "ws";
import { checkIsLiveQuery, uuid } from "./utils";

import traverseAndBuildOptimizedQuery from "./traverseAndBuildOptimizedQuery";
import { LogLevels } from "./Logger";
import { QuerySubscribe } from "./QuerySubscribe";
import { QueryLive } from "./QueryLive";
import { QueryBasicHTTP } from "./QueryBasicHTTP";
import { QueryBasicWS } from "./QueryBasicWS";
import { parseBuffer } from "./utils";

import type {
  RouterMap,
  MessageResponder,
  IGlobalConfiguration,
  IConstructorRouteOptions,
} from "./types";
import type { WebSocketBehavior } from "uWebSockets.js";

type Query = QuerySubscribe | QueryLive | QueryBasicHTTP | QueryBasicWS;

// TODO: Fix this in ts config and change to import
// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require("../package.json").version;

const DEFAULT_CONFIGURATION: IGlobalConfiguration = {
  // cacheEngine: undefined,
  logger: undefined,
  auth: undefined,
  proxy: undefined,
  defaultLogLevel: LogLevels.ERROR,
  defaultTimeoutInMs: 10000,
  defaultCacheTimeInMs: 0,
  optimizeQueryRequest: false,
  headers: { "x-graphql-rest-router-version": version },
};

export default class Router {
  private schema: DocumentNode;
  private options: IGlobalConfiguration;

  public queries: Query[] = [];
  public axios: AxiosInstance | undefined;
  public wsClient: GraphQLWebSocketClient | undefined;
  public isHttpEndpoint: boolean;

  private passThroughHeaders: string[] = [];
  public endpoint: string;

  constructor(
    endpoint: string,
    schema: string,
    assignedConfiguration?: IGlobalConfiguration
  ) {
    const {
      auth,
      proxy,
      defaultTimeoutInMs: timeout,
      passThroughHeaders,
      ...options
    } = {
      ...DEFAULT_CONFIGURATION,
      ...assignedConfiguration,

      // Default headers should always override
      headers: {
        ...(assignedConfiguration || {}).headers,
        ...DEFAULT_CONFIGURATION.headers,
      },
    };

    if (endpoint.startsWith("http")) {
      this.isHttpEndpoint = true;

      this.axios = axios.create({
        baseURL: endpoint,
        method: "post",
        // headers: options.headers,
        timeout,
        auth,
        proxy,
        responseType: "json",
      });
    } else {
      this.isHttpEndpoint = false;

      this.wsClient = createClient({
        url: endpoint,
        webSocketImpl: ws,
        generateID: () => uuid(),
      });
    }

    if (passThroughHeaders) {
      this.passThroughHeaders = passThroughHeaders;
    }

    this.schema = parse(schema);
    this.options = options;
    this.endpoint = endpoint;
  }

  private queryForOperation(operationName: string): DocumentNode {
    const { schema, options } = this;
    const { optimizeQueryRequest } = options;

    if (!schema) {
      console.warn("optimizeQueryRequest has no effect when not using schema");
      return schema;
    }

    if (optimizeQueryRequest) {
      try {
        return traverseAndBuildOptimizedQuery(schema, operationName);
      } catch (e) {
        console.error("Failed to build optimized schema", e);
      }
    }

    return schema;
  }

  public mountAll(): Router {
    const { schema: defaultSchema } = this;
    // console.log("defaultSchema", defaultSchema);
    const operations = separateOperations(defaultSchema);
    // console.log("operations", Object.keys(operations));
    Object.keys(operations).forEach((operation) => {
      this.mount(operation);
    });

    return this;
  }

  public mount(
    _operationName: string,
    options?: IConstructorRouteOptions | { passThroughHeaders: string[] }
  ): Query {
    const {
      schema: defaultSchema,
      axios,
      wsClient,
      options: {
        logger,
        defaultLogLevel,
        // cacheEngine,
        defaultCacheTimeInMs,
        cacheKeyIncludedHeaders,
      },
    } = this;

    const opInfo = getOperationAST(defaultSchema, _operationName);
    const isOperationName = defaultSchema && Boolean(opInfo);
    // const operationName = isOperationName ? _operationName : undefined;
    const schema = isOperationName
      ? this.queryForOperation(_operationName)
      : parse(_operationName);

    const passThroughHeaders = options
      ? [...this.passThroughHeaders, ...(options.passThroughHeaders || [])]
      : [...this.passThroughHeaders];

    const routeOptions: IConstructorRouteOptions = {
      ...options,
      operationName: _operationName,
      axios: axios!,
      wsClient: wsClient!,
      schema,
      // cacheEngine,
      cacheTimeInMs: defaultCacheTimeInMs,
      cacheKeyIncludedHeaders,
      logger,
      logLevel: defaultLogLevel || DEFAULT_CONFIGURATION.defaultLogLevel!,
      passThroughHeaders,
    };

    const isLiveQuery = checkIsLiveQuery(opInfo);
    const isSubscription = opInfo?.operation === "subscription";

    let graphQLRoute;
    if (this.isHttpEndpoint) {
      if (isSubscription || isLiveQuery) {
        throw new Error(
          "Subscriptions and live queries are not supported for http endpoints"
        );
      }
      graphQLRoute = new QueryBasicHTTP(routeOptions);
    } else {
      if (isSubscription) {
        graphQLRoute = new QuerySubscribe(routeOptions);
      } else if (isLiveQuery) {
        graphQLRoute = new QueryLive(routeOptions);
      } else {
        graphQLRoute = new QueryBasicWS(routeOptions);
      }
    }

    this.queries.push(graphQLRoute);
    return graphQLRoute;
  }

  public asMessageResponders(): RouterMap {
    const router = {};

    this.queries.forEach((route) => {
      const { operationName } = route;
      console.log(`--> ${operationName} (${route.constructor.name})`);

      if (operationName) {
        const routeFn: Required<MessageResponder> = {
          query: async () => {},
          subscribe: async () => {},
          unsubscribe: async () => {},
          ...route.asMessageResponder(),
        };
        router[operationName] = routeFn;
      }
    });

    return router;
  }

  public uWebSocketBehavior(): WebSocketBehavior {
    this.mountAll();
    const router = this.asMessageResponders();

    return {
      open: (ws) => {
        ws.clientId = uuid();
        const ip = Buffer.from(ws.getRemoteAddressAsText()).toString();
        console.log(`* new connection from ${ip} as ${ws.clientId}`);
      },
      message: (ws, buffer, isBinary) => {
        if (isBinary) {
          ws.send(
            JSON.stringify({ status: "BINARY_NOT_SUPPORTED" }),
            isBinary,
            false
          );
          return;
        }

        const message = parseBuffer(buffer);
        console.log(`* received message from ${ws.clientId}:`, message);
        const clientId = ws.clientId;

        if (!message) {
          throw new Error("Message missing");
        }

        if (!message.operation) {
          throw new Error("Operation missing in message");
        }

        if (!message.method) {
          throw new Error("Method missing in message");
        }

        if (!(message.operation in router)) {
          throw new Error(`Operation ${message.operation} not supported`);
        }

        const responder: MessageResponder = router[message.operation];

        if (message.method === "subscribe") {
          // ws.subscribe(createSubscriptionHashStable(message));
          responder.subscribe(clientId, message, (msg) => {
            console.log(`* sending message to ${ws.clientId}:`, msg);
            ws.send(JSON.stringify(msg), isBinary, false);
          });
          return;
        }

        if (message.method === "unsubscribe") {
          // ws.unsubscribe(createSubscriptionHashStable(message));
          responder.unsubscribe(clientId, message);
        }

        if (message.method === "query") {
          if (message.operation) {
            responder.query(clientId, message, (msg) => {
              console.log("* sending message:", ws.clientId, msg);
              ws.send(JSON.stringify(msg), isBinary, false);
            });
          }
          return;
        }
      },
      drain: () => {
        return;
      },
      close: (ws) => {
        console.log(`* closing. Good bye ${ws.clientId}`);

        Object.keys(this.queries).forEach((operation) => {
          this.queries[operation]?.closeClient(ws.clientId);
        });
      },
    };
  }
}
