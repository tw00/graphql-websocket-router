import {
  AxiosBasicCredentials,
  AxiosProxyConfig,
  AxiosInstance,
  AxiosTransformer,
} from "axios";
import { DocumentNode } from "graphql";
import { IncomingHttpHeaders } from "http";

export interface IGlobalConfiguration {
  cacheEngine?: ICacheEngine;
  defaultTimeoutInMs?: number;
  defaultCacheTimeInMs?: number;
  logger?: ILogger;
  defaultLogLevel?: LogLevel;
  autoDiscoverEndpoints?: boolean;
  optimizeQueryRequest?: boolean;
  headers?: Record<string, unknown>;
  passThroughHeaders?: string[];
  cacheKeyIncludedHeaders?: string[];
  auth?: AxiosBasicCredentials;
  proxy?: AxiosProxyConfig;
}

// TODO: DOppelt
export interface IConstructorRouteOptions {
  schema: DocumentNode | string; // GraphQL Document Type
  operationName: string;
  axios: AxiosInstance;
  logger?: ILogger;
  logLevel: LogLevel;
  path?: string;
  cacheTimeInMs?: number;
  cacheEngine?: ICacheEngine;
  method?: string;
  passThroughHeaders?: string[];
  cacheKeyIncludedHeaders?: string[];
  staticVariables?: Record<string, unknown>;
  defaultVariables?: Record<string, unknown>;
}

export interface IRouteOptions {
  path?: string;
  logger?: ILogger;
  logLevel?: LogLevel;
  cacheTimeInMs?: number;
  cacheEngine?: ICacheEngine;
  method?: string;
  passThroughHeaders?: string[];
  cacheKeyIncludedHeaders?: string[];
  staticVariables?: Record<string, unknown>;
  defaultVariables?: Record<string, unknown>;
  transformRequest?: AxiosTransformer;
  transformResponse?: AxiosTransformer;
}

export interface IOperationVariableMap {
  [variableName: string]: IOperationVariable;
}

export interface IOperationVariable {
  name: string;
  required: boolean;
  type: string;
  array: boolean;
  defaultValue?: string | boolean | number | null;
}

export interface ICacheEngine {
  get: (
    key: string,
    setFn?: () => string
  ) => string | null | Promise<string | null>;
  set: (
    key: string,
    value: string,
    cacheTimeInMs?: number
  ) => void | Promise<void>;
}

export interface ILogger {
  error: (message: string) => void;
  warn: (message: string) => void;
  info: (message: string) => void;
  debug: (message: string) => void;
}

export type LogLevel = -1 | 0 | 1 | 2 | 3;

export interface ILogLevels {
  SILENT: LogLevel;
  ERROR: LogLevel;
  WARN: LogLevel;
  INFO: LogLevel;
  DEBUG: LogLevel;
}

export interface IResponse {
  statusCode: number;
  body: any;
}

export interface INamedGraphQLQuery {
  operation?: string; // TODO
  variables: Record<string, unknown>;
  headers?: IncomingHttpHeaders;
}

export interface IInputMessage extends INamedGraphQLQuery {
  method: string;
}

export interface IMessageResponse {
  statusCode: number;
  responseBody: any;
}

export interface ILiveQueryOptions {
  operationName: string;
  schema: DocumentNode | string;
  axios: AxiosInstance;
}

export type RouterFn = (
  msg: INamedGraphQLQuery,
  next: (msg: IMessageResponse) => void
) => Promise<void>;

export type RouterMap = Record<string, RouterFn>;
