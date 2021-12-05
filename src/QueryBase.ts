import {
  OperationDefinitionNode,
  VariableDefinitionNode,
  parse,
  getOperationAST,
  DocumentNode,
  NonNullTypeNode,
  ListTypeNode,
  Kind,
} from "graphql";
import type {
  IConstructorRouteOptions,
  IOperationVariable,
  IOperationVariableMap,
  MessageResponder,
} from "./types";
import Logger from "./Logger";

function isVariableArray(
  node: VariableDefinitionNode | NonNullTypeNode
): boolean {
  if (node.type.kind === "NonNullType") {
    return isVariableArray(node.type);
  }

  return node.type.kind === "ListType";
}

function translateVariableType(
  node: VariableDefinitionNode | ListTypeNode | NonNullTypeNode
): string {
  if (node.type.kind === "NonNullType" || node.type.kind === "ListType") {
    return translateVariableType(node.type);
  }

  return node.type.name.value;
}

function getDefaultValue(
  node: VariableDefinitionNode
): string | boolean | number | null | undefined {
  if (
    !node.defaultValue ||
    node.defaultValue.kind === Kind.LIST ||
    node.defaultValue.kind === Kind.OBJECT
  ) {
    return undefined;
  }

  if (node.defaultValue.kind === "NullValue") {
    return null;
  }

  return node.defaultValue.value;
}

export abstract class QueryBase {
  protected schema!: DocumentNode;
  protected logger!: Logger;

  public operationVariables!: IOperationVariableMap;
  public operationName?: string;
  constructor(options: IConstructorRouteOptions) {
    this.logger = new Logger();
    this.schema =
      typeof options.schema === "string"
        ? parse(options.schema)
        : options.schema;
    this.operationName = options.operationName;
    this.setOperationName(options.operationName);
  }

  abstract asMessageResponder(): Partial<MessageResponder>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async closeClient(_clientId: string): Promise<void> {
    return;
  }

  private setOperationName(operationName?: string): void {
    const operation = getOperationAST(this.schema, operationName);

    if (!operation) {
      throw new Error(
        `The named query "${operationName}" does not exist in the Schema provided`
      );
    }

    this.operationName = operationName;
    this.operationVariables = this.getOperationVariables(operation);
  }

  private getOperationVariables(
    operation: OperationDefinitionNode
  ): IOperationVariableMap {
    const variableMap: IOperationVariableMap = {};

    operation.variableDefinitions?.forEach(
      (node: VariableDefinitionNode): void => {
        const variable: IOperationVariable = {
          name: node.variable.name.value,
          required: node.type.kind === "NonNullType",
          type: translateVariableType(node),
          array: isVariableArray(node),
          defaultValue: getDefaultValue(node),
        };

        variableMap[variable.name] = variable;
      }
    );

    return variableMap;
  }

  private assembleVariables(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    return params;
  }

  private get requiredVariables(): string[] {
    return Object.values(this.operationVariables)
      .filter(({ required, defaultValue }) => required && !defaultValue)
      .map(({ name }) => name);
  }

  private missingVariables(variables: Record<string, unknown>): string[] {
    const variablesAsKeys = Object.keys(variables);

    return this.requiredVariables.filter(
      (requiredVariable) => !variablesAsKeys.includes(requiredVariable)
    );
  }

  protected checkVariables(providedVariables) {
    // Assemble variables from query, path and default values
    const assembledVariables = this.assembleVariables(providedVariables);
    const missingVariables = this.missingVariables(assembledVariables);

    if (missingVariables.length) {
      return false;
    }
    return true;
  }

}
