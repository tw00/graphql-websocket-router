import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import {
  parse,
  DocumentNode,
  getOperationAST,
  separateOperations,
} from "graphql";

// import Route from "./Route";
import traverseAndBuildOptimizedQuery from "./traverseAndBuildOptimizedQuery";
import { IGlobalConfiguration, IConstructorRouteOptions } from "./types";
import { LogLevels } from "./Logger";
import { LiveQuery } from "./LiveQuery";
import { IMessageResponse, RouterMap } from "./types";

// TODO: Fix this in ts config and change to import
// eslint-disable-next-line @typescript-eslint/no-var-requires
const version = require("../package.json").version;

const DEFAULT_CONFIGURATION: IGlobalConfiguration = {
  cacheEngine: undefined,
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

  public queries: LiveQuery[] = [];
  public axios: AxiosInstance;

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

    const axiosConfig: AxiosRequestConfig = {
      baseURL: endpoint,
      method: "post",
      headers: options.headers,
      timeout,
      auth,
      proxy,
      responseType: "json",
    };

    this.axios = axios.create(axiosConfig);

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
  ): LiveQuery {
    const {
      schema: defaultSchema,
      axios,
      options: {
        logger,
        defaultLogLevel,
        cacheEngine,
        defaultCacheTimeInMs,
        cacheKeyIncludedHeaders,
      },
    } = this;

    const isOperationName =
      defaultSchema && Boolean(getOperationAST(defaultSchema, _operationName));
    const operationName = isOperationName ? _operationName : undefined;
    const schema = isOperationName
      ? this.queryForOperation(_operationName)
      : parse(_operationName);

    const passThroughHeaders = options
      ? [...this.passThroughHeaders, ...(options.passThroughHeaders || [])]
      : [...this.passThroughHeaders];

    const routeOptions: IConstructorRouteOptions = {
      ...options,
      operationName: _operationName,
      axios,
      schema,
      cacheEngine,
      cacheTimeInMs: defaultCacheTimeInMs,
      cacheKeyIncludedHeaders,
      logger,
      logLevel: defaultLogLevel || DEFAULT_CONFIGURATION.defaultLogLevel!,
      passThroughHeaders,
    };

    const graphQLRoute = new LiveQuery(routeOptions);
    this.queries.push(graphQLRoute);

    return graphQLRoute;
  }

  asMessageResponders(): RouterMap {
    const router = {};

    this.queries.forEach((route) => {
      const { operationName } = route;
      if (operationName) {
        const routeFn = route.asMessageResponder();
        router[operationName] = routeFn;
      }
    });

    return router;
  }
}
