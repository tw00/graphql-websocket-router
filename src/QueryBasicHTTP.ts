import {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosRequestHeaders,
} from "axios";
import { print } from "graphql";

import type {
  IMessageResponse,
  IConstructorRouteOptions,
  RouterFn,
} from "./types";
import { QueryBase } from "./QueryBase";

export class QueryBasicHTTP extends QueryBase {
  private axios!: AxiosInstance;

  constructor(options: IConstructorRouteOptions) {
    super(options);
    this.axios = options.axios!;
  }

  public asMessageResponder(): RouterFn {
    return async (msg, next) => {
      const { variables, headers = {} } = msg;

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

      const { statusCode, data, error } = await this.makeRequest(
        operation,
        assembledVariables,
        headers
      );

      next({ statusCode, data, error });
    };
  }

  private async makeRequest(
    operationName: string,
    variables: Record<string, unknown>,
    headers: AxiosRequestHeaders = {}
  ): Promise<IMessageResponse> {
    const { axios, schema } = this;

    this.logger.info(
      `Incoming request on ${operationName}, request variables: ${JSON.stringify(
        variables
      )}`
    );

    const config: AxiosRequestConfig = {
      data: {
        query: print(schema),
        variables,
        operationName,
      },
      headers,
    };

    try {
      const { data, status } = await axios(config);

      data.errors?.forEach((error: unknown) => {
        this.logger.error(
          `Error in GraphQL response: ${JSON.stringify(error)}`
        );
      });

      return <IMessageResponse>{ data, statusCode: status };
    } catch (error: unknown) {
      if (!(error instanceof Error)) {
        throw new Error("UNKOWN");
      }

      if ((error as AxiosError)?.isAxiosError) {
        const axiosError = error as AxiosError;
        this.logger.error(axiosError.stack as string);

        if (axiosError.response) {
          return <IMessageResponse>{
            statusCode: axiosError.response.status,
            data: axiosError.response.data,
          };
        }

        if (axiosError.message.indexOf("timeout") >= 0) {
          return <IMessageResponse>{
            statusCode: 504,
            data: null,
            error: axiosError.message,
          };
        }
      }

      return <IMessageResponse>{
        statusCode: 500,
        data: null,
        error: error.message,
      };
    }
  }
}
