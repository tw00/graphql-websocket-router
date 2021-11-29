import { DocumentNode, parse } from "graphql";
import Logger from "./Logger";
import type { IConstructorRouteOptions, RouterFn } from "./types";

export abstract class QueryBase {
  public operationName?: string;

  protected schema!: DocumentNode;
  protected logger!: Logger;

  constructor(options: IConstructorRouteOptions) {
    this.logger = new Logger();
    this.schema =
      typeof options.schema === "string"
        ? parse(options.schema)
        : options.schema;
    this.operationName = options.operationName;
  }

  abstract asMessageResponder(): RouterFn;

  // protected xxx(): xxx { }
}
