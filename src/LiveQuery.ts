/* eslint-disable @typescript-eslint/no-explicit-any */
import { AxiosInstance, AxiosRequestConfig, AxiosError } from "axios";
import { DocumentNode, parse, print } from "graphql";
import { IncomingHttpHeaders } from "http";
import { ILiveQueryOptions, IMessageResponse, RouterFn } from ".";
import Logger from "./Logger";
import { IResponse } from "./types";

export class LiveQuery {
  public operationName?: string;

  private axios!: AxiosInstance;
  private schema!: DocumentNode;
  private logger!: Logger;

  constructor(options: ILiveQueryOptions) {
    // console.log("LiveQuery", options);
    this.logger = new Logger();
    this.schema =
      typeof options.schema === "string"
        ? parse(options.schema)
        : options.schema;
    this.axios = options.axios;
    this.operationName = options.operationName;
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

      const { statusCode, body: responseBody } = await this.makeRequest(
        operation,
        assembledVariables,
        headers
      );

      console.log("XXX", {
        statusCode,
        responseBody,
        errors: responseBody.errors,
      });

      /* TODO:
      susbcribeRequest(operation, assembledVariables, next)
      */

      // res.status(statusCode).json(responseBody);
      next({ statusCode, responseBody });
    };
  }

  private async makeRequest(
    operationName: string,
    variables: Record<string, unknown>,
    headers: IncomingHttpHeaders = {}
  ): Promise<IResponse> {
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
    console.log("config.data", config.data);

    try {
      const { data, status } = await axios(config);

      data.errors?.forEach((error: unknown) => {
        this.logger.error(
          `Error in GraphQL response: ${JSON.stringify(error)}`
        );
      });

      return <IResponse>{ body: data, statusCode: status };
    } catch (error: unknown) {
      if (!(error instanceof Error)) {
        throw new Error("UNKOWN");
      }

      if ((error as AxiosError)?.isAxiosError) {
        const axiosError = error as AxiosError;
        this.logger.error(axiosError.stack as string);

        if (axiosError.response) {
          return <IResponse>{
            body: axiosError.response.data,
            statusCode: axiosError.response.status,
          };
        }

        if (axiosError.message.indexOf("timeout") >= 0) {
          return <IResponse>{
            statusCode: 504,
            body: {
              error: axiosError.message,
            },
          };
        }
      }

      return <IResponse>{
        statusCode: 500,
        body: {
          error: error.message,
        },
      };
    }
  }
}
