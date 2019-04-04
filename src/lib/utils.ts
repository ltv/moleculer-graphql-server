import { ApolloLink } from 'apollo-link';
import { GraphQLSchema } from 'graphql';
import { introspectSchema, makeRemoteExecutableSchema } from 'graphql-tools';
import { Service, ServiceBroker, ServiceSchema } from 'moleculer';
import { MoleculerLink } from './MoleculerLink';

export interface SchemaBuilderContext {
  broker: ServiceBroker;
  service: Service | ServiceSchema;
  link?: ApolloLink;
}

export interface CreateRemoteSchemaOptions {
  broker: ServiceBroker;
  service: Service | ServiceSchema;
  schemaBuilder?: (context: SchemaBuilderContext) => Promise<GraphQLSchema>;
}

export async function createRemoteSchema(options: CreateRemoteSchemaOptions) {
  const { broker, service, schemaBuilder } = options;
  const link = new MoleculerLink({ broker, serviceName: service.name });
  const schema = schemaBuilder
    ? await schemaBuilder({ broker, service, link })
    : await introspectSchema(link);
  return makeRemoteExecutableSchema({
    schema,
    link
  });
}
