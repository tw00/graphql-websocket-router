import { print } from "graphql";
import type { Client as GraphQLWebSocketClient } from "graphql-ws";
import { IMessageResponse, IConstructorRouteOptions, RouterFn } from "./types";
import { QueryBase } from "./QueryBase";

export class QueryBasicWS extends QueryBase {
  private wsClient: GraphQLWebSocketClient;

  constructor(options: IConstructorRouteOptions) {
    super(options);
    this.wsClient = options.wsClient!;
  }

  public asMessageResponder(): RouterFn {
    return async (msg, next) => {
      const { variables } = msg;

      const operation = this.operationName as string;
      const providedVariables = variables;
      const assembledVariables = providedVariables;

      // Assemble variables from query, path and default values
      // const assembledVariables = this.assembleVariables(providedVariables);
      // const missingVariables = this.missingVariables(assembledVariables);

      // if (missingVariables.length) {
      //   res.json({
      //     error: "Missing Variables",
      //   });
      //   return;
      // }

      try {
        const res = await this.makeQuery(operation, assembledVariables);
        next(res);
      } catch (error) {
        console.log("FAILED WITH", error);
      }
    };
  }

  private async makeQuery(
    operationName?: string | null,
    variables?: Record<string, unknown> | null
  ): Promise<IMessageResponse> {
    const { schema } = this;

    this.logger.info(
      `Incoming request on ${operationName}, request variables: ${JSON.stringify(
        variables
      )}`
    );

    return await new Promise((resolve, reject) => {
      let result;
      this.wsClient.subscribe(
        {
          query: print(schema),
          variables,
          operationName,
        },
        {
          next: (data) => (result = data),
          error: reject,
          complete: () => resolve(result),
        }
      );

      return { statusCode: 200, data: result };
    });
  }
}
