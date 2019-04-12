import { renderPlaygroundPage } from '@apollographql/graphql-playground-html';
import accept from 'accept';
import { ApolloServerBase } from 'apollo-server-core';
// import { processRequest } from 'graphql-upload'; Not providing graphql-upload at this moment
import { moleculerApollo } from './MoleculerApollo';

function send(
  req,
  res,
  statusCode,
  data,
  responseType = 'application/json'
): void {
  res.statusCode = statusCode;

  const ctx = res.$ctx;
  // tslint:disable-next-line:no-if-statement
  if (!ctx.meta.$responseType) {
    ctx.meta.$responseType = responseType;
  }

  const service = res.$service;
  service.sendResponse(req, res, data);
}

export class ApolloServer extends ApolloServerBase {
  public graphqlPath: string = '/graphql';
  // Extract Apollo Server options from the request.
  public createGraphQLServerOptions(req, res): any {
    return super.graphQLServerOptions({ req, res });
  }

  // Prepares and returns an async function that can be used to handle
  // GraphQL requests.
  public createHandler(options: { path?: string } = {}): any {
    const { path = '/graphql' } = options;
    const promiseWillStart = this.willStart();
    return async (req, res) => {
      this.graphqlPath = path;

      await promiseWillStart;

      // If file uploads are detected, prepare them for easier handling with
      // the help of `graphql-upload`.
      // if (this.uploadsConfig) {
      //   const contentType = req.headers['content-type'];
      //   if (contentType && contentType.startsWith('multipart/form-data')) {
      //     req.filePayload = await processRequest(req, res, this.uploadsConfig);
      //   }
      // }

      // If the `playgroundOptions` are set, register a `graphql-playground` instance
      // (not available in production) that is then used to handle all
      // incoming GraphQL requests.
      if (this.playgroundOptions && req.method === 'GET') {
        const { mediaTypes } = accept.parseAll(req.headers);
        const prefersHTML =
          mediaTypes.find(
            x => x === 'text/html' || x === 'application/json'
          ) === 'text/html';

        if (prefersHTML) {
          const middlewareOptions = {
            endpoint: this.graphqlPath,
            subscriptionEndpoint: this.subscriptionsPath,
            ...this.playgroundOptions
          };
          return send(
            req,
            res,
            200,
            renderPlaygroundPage(middlewareOptions),
            'text/html'
          );
        }
      }

      // Handle incoming GraphQL requests using Apollo Server.
      const graphqlHandler = moleculerApollo(() =>
        this.createGraphQLServerOptions(req, res)
      );
      const responseData = await graphqlHandler(req, res);
      send(req, res, 200, responseData);
    };
  }

  // This integration supports file uploads.
  public supportsUploads(): boolean {
    return true;
  }

  // This integration supports subscriptions.
  public supportsSubscriptions(): boolean {
    return true;
  }
}
