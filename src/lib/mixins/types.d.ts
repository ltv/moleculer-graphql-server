import { ApolloLink } from 'apollo-link';
import { GraphQLSchema } from 'graphql';
import { MoleculerLink } from '../MoleculerLink';
import { SchemaBuilderContext } from '../utils';

export interface GatewayMixinOptions {
  name?: string;
  apollo?: {} | boolean;
  routeOptions?: any; // TODO: change to correct route option from moleculer
  subscriptionEventName?: string;
  serverOptions?: any;
  schema?: any;
  schemaBuilder?: (context: SchemaBuilderContext) => Promise<GraphQLSchema>;
}
