import { OperationDefinitionNode } from "graphql";
import { IInputMessage } from "./types";

export function parseBuffer(buffer: ArrayBuffer): IInputMessage | null {
  try {
    return JSON.parse(Buffer.from(buffer).toString());
  } catch (error) {
    return null;
  }
}


export function createSubscriptionHashStable(variables, headers): string {
  return `${JSON.stringify(variables)}:${JSON.stringify(headers)}`;
}

export function uuid(): string {
  return Math.random().toString(16).slice(2);
}

export function checkIsLiveQuery(
  op: OperationDefinitionNode | null | undefined
): boolean {
  const matchLiveDirective = (directive) => directive?.name?.value === "live";
  return op?.directives?.findIndex(matchLiveDirective) !== -1 ?? false;
}
