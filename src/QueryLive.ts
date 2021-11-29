import { print } from "graphql";
import type { Client as GraphQLWebSocketClient } from "graphql-ws";
import { IConstructorRouteOptions, RouterFn } from "./types";
import { QueryBase } from "./QueryBase";

export class QueryLive extends QueryBase {
  private wsClient: GraphQLWebSocketClient;

  constructor(options: IConstructorRouteOptions) {
    super(options);
    this.wsClient = options.wsClient!;
  }

  public asMessageResponder(): RouterFn {
    return async (msg, next) => {
      this.logger.info("Hi");
      // this.wsClient.subscribe('xxx')
      print(this.schema);
    };
  }
}
