import { print } from "graphql";
import { IncomingHttpHeaders } from "http";
import type { Client as GraphQLWebSocketClient } from "graphql-ws";
import { IMessageResponse, IConstructorRouteOptions, RouterFn } from "./types";
import { QueryBase } from "./QueryBase";

export class QuerySubscribe extends QueryBase {
  private wsClient: GraphQLWebSocketClient;

  constructor(options: IConstructorRouteOptions) {
    super(options);
    this.wsClient = options.wsClient!;
  }

  public asMessageResponder(): RouterFn {
    return async (msg, next) => {
      const { variables, headers = {} } = msg;
      // const { operation } = msg;

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

      await this.makeSubscribe(next, operation, assembledVariables, headers);
    };
  }

  // TODO: Avoid creating multiple subscriptions for same JSON.stringify(variables)

  private async makeSubscribe(
    onNext: (msg: IMessageResponse) => void,
    operationName?: string | null,
    variables?: Record<string, unknown> | null,
    headers: IncomingHttpHeaders = {}
  ): Promise<() => void> {
    const { schema } = this;

    this.logger.info(
      `Incoming request on ${operationName}, request variables: ${JSON.stringify(
        variables
      )}`
    );

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    let unsubscribe = () => {};

    await new Promise<void>((resolve, reject) => {
      unsubscribe = this.wsClient.subscribe(
        {
          query: print(schema),
          variables,
          operationName,
          // extensions,
        },
        {
          next: onNext,
          error: reject,
          complete: resolve,
        }
      );
    });

    return unsubscribe;
  }
}
