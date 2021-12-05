/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { print } from "graphql";
import type { Client as GraphQLWebSocketClient } from "graphql-ws";
import {
  IMessageResponse,
  IConstructorRouteOptions,
  MessageResponder,
} from "./types";
import { QueryBase } from "./QueryBase";
import { createSubscriptionHashStable } from "./utils";
import { INamedGraphQLQuery } from "./types";
import EventSource from "./EventSource";

export class QuerySubscribe extends QueryBase {
  private wsClient: GraphQLWebSocketClient;
  private subscriptions: Map<string, EventSource<IMessageResponse>>;
  private unsubscribeFns: Record<string, () => void>;

  constructor(options: IConstructorRouteOptions) {
    super(options);
    this.wsClient = options.wsClient!;
    this.subscriptions = new Map();
    this.unsubscribeFns = {};
  }

  public asMessageResponder(): Partial<MessageResponder> {
    return {
      subscribe: this.subscribe.bind(this),
      unsubscribe: this.unsubscribe.bind(this),
    };
  }

  private async subscribe(
    clientId: string,
    msg: INamedGraphQLQuery,
    next: (msg: IMessageResponse) => void
  ): Promise<void> {
    const {
      variables,
      // operation,
      // headers = {}
    } = msg;

    const operation = this.operationName as string;

    if (!this.checkVariables(variables)) {
      throw new Error("Missing variables.");
    }

    // TODO: Respect headers
    const hash = createSubscriptionHashStable(variables, {});

    const subscription =
      this.subscriptions.get(hash) || //
      new EventSource<IMessageResponse>();

    subscription.addObserver(clientId, next);
    this.subscriptions.set(hash, subscription);

    this.unsubscribeFns[hash] = await this.makeSubscribe(
      subscription.createNotifier(),
      operation,
      variables
      // headers
    );
  }

  private async unsubscribe(
    clientId: string,
    msg: INamedGraphQLQuery
  ): Promise<void> {
    const { variables } = msg;
    const hash = createSubscriptionHashStable(variables, {});
    if (this.subscriptions.has(hash)) {
      const subscription = this.subscriptions.get(hash)!;
      subscription.removeObserver(clientId);
      if (!subscription.hasObservers()) {
        console.log(
          `* terminating upstream subscriptions as there are no listeners left for '${this.operationName}' with #${hash}`
        );
        this.unsubscribeFns[hash]();
      }
    }
  }

  public async closeClient(clientId: string): Promise<void> {
    this.subscriptions.forEach((subscription, hash) => {
      subscription.removeObserver(clientId);
      if (!subscription.hasObservers()) {
        console.log(
          `* terminating upstream subscriptions as there are no listeners left for '${this.operationName}' with #${hash}`
        );
        this.unsubscribeFns[hash]();
      }
    });
  }

  private handleUpstreamConnectionError(
    error: Error,
    onNext: (msg: IMessageResponse) => void
  ) {
    console.error("* upstream connection error:", error.message);
    onNext({
      status: "error",
      data: null,
      error: "UpstreamConnectionError",
      errorDetails: { message: error.message },
    });
  }

  private async makeSubscribe(
    onNext: (msg: IMessageResponse) => void,
    operationName?: string | null,
    variables?: Record<string, unknown> | null
    // headers: IncomingHttpHeaders = {}
  ): Promise<() => void> {
    const { schema } = this;

    this.logger.info(
      `Incoming request on ${operationName}, request variables: ${JSON.stringify(
        variables
      )}`
    );

    return this.wsClient.subscribe(
      {
        query: print(schema),
        variables,
        operationName,
      },
      {
        next: onNext,
        error: (err) =>
          this.handleUpstreamConnectionError(err as Error, onNext),
        complete: () => {
          // TODO: upstream server has terminated connection
        },
      }
    );
  }
}
