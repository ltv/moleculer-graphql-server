import { convertNodeHttpToRequest, runHttpQuery } from 'apollo-server-core';
import url from 'url';

// Utility function used to set multiple headers on a response object.
function setHeaders(res, headers): void {
  Object.keys(headers).forEach(header =>
    res.setHeader(header, headers[header])
  );
}

export function moleculerApollo(options): any {
  if (!options) {
    throw new Error('Apollo Server requires options.');
  }

  if (arguments.length > 1) {
    throw new Error(
      `Apollo Server expects exactly one argument, got ${arguments.length}`
    );
  }

  return async function graphqlHandler(req, res): Promise<any> {
    let query;
    try {
      query =
        req.method === 'POST'
          ? (query = req.filePayload || req.body)
          : url.parse(req.url, true).query;
    } catch (error) {
      // Do nothing; `query` stays `undefined`
    }

    try {
      const { graphqlResponse, responseInit } = await runHttpQuery([req, res], {
        method: req.method,
        options,
        query,
        request: convertNodeHttpToRequest(req)
      });

      setHeaders(res, responseInit.headers);

      return graphqlResponse;
    } catch (error) {
      if ('HttpQueryError' === error.name && error.headers) {
        setHeaders(res, error.headers);
      }

      if (!error.statusCode) {
        error.statusCode = 500;
      }

      res.statusCode = error.statusCode || error.code || 500;
      res.end(error.message);

      return undefined;
    }
  };
}
