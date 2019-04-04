// tslint:disable:no-submodule-imports
import { ApolloLink, Observable, Operation, RequestHandler } from 'apollo-link';
import { ExecutionResult } from 'graphql';
import { print } from 'graphql/language/printer';
import { ServiceBroker } from 'moleculer';

export interface ServiceOptions {
  broker: ServiceBroker;
  serviceName: string;
}

function createMoleculerLink(opts: ServiceOptions): ApolloLink {
  return new ApolloLink(
    operation =>
      new Observable(observer => {
        const { credentials } = operation.getContext();
        const { operationName, extensions, variables, query } = operation;
        const { broker, serviceName } = opts;

        try {
          broker
            .call(`${serviceName}.graphql`, {
              credentials,
              query: print(query),
              variables,
              extensions,
              operationName
            })
            .then(result => {
              observer.next(result);
              observer.complete();
              return result;
            });
          // TODO: Check the error of PromiseLike
          // .catch(err => {
          //   observer.error(err);
          // });
        } catch (err) {
          observer.error(err);
        }
      })
  );
}

export class MoleculerLink extends ApolloLink {
  public requester: RequestHandler;

  constructor(opts: ServiceOptions) {
    super();
    this.requester = createMoleculerLink(opts).request;
  }

  public request(op: Operation): Observable<ExecutionResult> | null {
    return this.requester(op);
  }
}
