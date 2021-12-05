import { print } from "graphql";
import { QueryBase } from "./QueryBase";
import { createSubscriptionHashStable } from "./utils";
import EventSource from "./EventSource";
import type {
  IConstructorRouteOptions,
  IMessageResponse,
  INamedGraphQLQuery,
  MessageResponder,
} from "./types";
import type { Client as GraphQLWebSocketClient } from "graphql-ws";

export class QueryLive extends QueryBase {
  private wsClient: GraphQLWebSocketClient;
  private subscriptions: Map<string, EventSource<IMessageResponse>>;
  private unsubscribeAll: () => void;

  constructor(options: IConstructorRouteOptions) {
    super(options);
    this.wsClient = options.wsClient!;
    this.subscriptions = new Map();
    this.unsubscribeAll = () => {};
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
    const { variables } = msg;

    const operation = this.operationName as string;

    if (!this.checkVariables(variables)) {
      throw new Error("Missing variables.");
    }

    const hash = createSubscriptionHashStable(variables, {});

    const subscription =
      this.subscriptions.get(hash) || //
      new EventSource<IMessageResponse>();

    await this.makeLiveQuery(
      subscription.createNotifier(),
      operation,
      variables
    );

    subscription.addObserver(clientId, next);
    this.subscriptions.set(hash, subscription);
  }

  private async unsubscribe(
    clientId: string,
    msg: INamedGraphQLQuery
  ): Promise<void> {
    const { variables } = msg;
    const hash = createSubscriptionHashStable(variables, {});
    if (this.subscriptions.has(hash)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const subscription = this.subscriptions.get(hash)!;
      subscription.removeObserver(clientId);
      if (!subscription.hasObservers()) {
        await this.unsubscribeAll();
      }
    }
  }

  private async makeLiveQuery(
    onNext: (msg: IMessageResponse) => void,
    operationName?: string | null,
    variables?: Record<string, unknown> | null
  ): Promise<void> {
    const { schema } = this;

    this.logger.info(
      `Incoming request on ${operationName}, request variables: ${JSON.stringify(
        variables
      )}`
    );

    const query = {
      query: print(schema),
      variables,
      operationName,
    };

    console.log("Query", query);
  }
}
