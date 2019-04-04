import DataLoader from 'dataloader';
import { printSchema } from 'graphql';
import { mergeSchemas } from 'graphql-tools';
import isPlainObject from 'lodash.isplainobject';
import { Errors, Service, ServiceSchema } from 'moleculer';
import { ApolloServer } from '../ApolloServer';
import { createRemoteSchema } from '../utils';
import { GatewayMixinOptions } from './types';

const { MoleculerServerError } = Errors;

const defaultGwOpts: GatewayMixinOptions = {
  apollo: {},
  routeOptions: {
    path: '/graphql'
  },
  schema: null,
  serverOptions: {},
  subscriptionEventName: 'graphql.publish',
  schemaBuilder: undefined
};

export function ApolloGatewayMixin(
  options: GatewayMixinOptions
): ServiceSchema {
  const mixinOptions = { ...defaultGwOpts, ...options };
  const { name = 'apollo-gateway' } = mixinOptions;
  let shouldUpdateSchema = true;

  const events = {
    '$services.changed'() {
      this.invalidateGraphQLSchema();
    },
    [mixinOptions.subscriptionEventName](event) {
      this.pubsub.publish(event.tag, event.payload);
    }
  };

  const methods = {
    /**
     * Invalidate the generated GraphQL schema
     */
    invalidateGraphQLSchema() {
      shouldUpdateSchema = true;
    },

    /**
     * Generate GraphQL Schema
     *
     * @param {Object[]} services
     * @returns {Object} Generated schema
     */
    async generateGraphQLSchema(
      services: ReadonlyArray<Service>
    ): Promise<any> {
      try {
        const pgServices: ReadonlyArray<Service> = services.filter(
          s => s.settings.hasGraphQLSchema
        );
        const processedServices = new Set();

        return Promise.all(
          pgServices.map(async s => {
            if (processedServices.has(s.name)) {
              return false;
            } else {
              processedServices.add(s.name);
            }

            const schema = await createRemoteSchema({
              broker: this.broker,
              service: s,
              schemaBuilder: mixinOptions.schemaBuilder
            });
            return schema;
          })
        );
      } catch (err) {
        throw new MoleculerServerError(
          'Unable to compile GraphQL schema',
          500,
          'UNABLE_COMPILE_GRAPHQL_SCHEMA',
          { err }
        );
      }
    },

    async prepareGraphQLSchema(): Promise<void> {
      // tslint:disable-next-line:no-if-statement
      if (!shouldUpdateSchema) {
        return;
      }
      this.logger.info(
        '♻ Recreate Apollo GraphQL server and regenerate GraphQL schema...'
      );
      try {
        const services = this.broker.registry.getServiceList({
          withActions: true
        });

        const schemas = await this.generateGraphQLSchema(services);
        const schema = mergeSchemas({ schemas });
        this.apolloServer = new ApolloServer({
          schema,
          context: ({ req, connection }) => {
            return req
              ? {
                  ctx: req.$ctx,
                  service: req.$service,
                  params: req.$params
                }
              : {
                  service: connection.$service
                };
          },
          subscriptions: {
            onConnect: connectionParams => ({
              ...connectionParams,
              $service: this
            })
          }
        });

        this.graphqlHandler = this.apolloServer.createHandler();
        this.apolloServer.installSubscriptionHandlers(this.server);
        this.graphqlSchema = schema;

        shouldUpdateSchema = false;

        this.broker.broadcast('graphql.schema.updated', {
          schema: printSchema(schema)
        });
      } catch (e) {
        this.logger.error(e);
        throw e;
      }
    },

    /**
     * Get the name of a service including version spec
     * @param {Object} service - Service object
     * @returns {String} Name of service including version spec
     */
    getServiceName(service) {
      return service.version
        ? `v${service.version}.${service.name}`
        : service.name;
    },

    /**
     * Create the DataLoader instances to be used for batch resolution
     * @param {Object} req
     * @param {Object[]} services
     * @returns {Object.<string, Object>} Key/value pairs of DataLoader instances
     */
    createLoaders(req, services) {
      return services.reduce((serviceAccum, service) => {
        const serviceName = this.getServiceName(service);

        const { graphql } = service.settings;
        if (graphql && graphql.resolvers) {
          const { resolvers } = graphql;

          const typeLoaders = Object.values(resolvers).reduce(
            (resolverAccum, type) => {
              const resolverLoaders = Object.values(type).reduce(
                (fieldAccum, resolver) => {
                  if (isPlainObject(resolver)) {
                    const {
                      action,
                      dataLoader = false,
                      rootParams = {}
                    } = resolver;
                    const actionParam = `${Object.values(rootParams)[0]}`; // use the first root parameter
                    if (dataLoader && actionParam) {
                      const resolverActionName = this.getResolverActionName(
                        serviceName,
                        action
                      );
                      if (fieldAccum[resolverActionName] == null) {
                        // create a new DataLoader instance
                        fieldAccum[resolverActionName] = new DataLoader(keys =>
                          req.$ctx.call(resolverActionName, {
                            [actionParam]: keys
                          })
                        );
                      }
                    }
                  }

                  return fieldAccum;
                },
                {}
              );

              return { ...resolverAccum, ...resolverLoaders };
            },
            {}
          );

          serviceAccum = { ...serviceAccum, ...typeLoaders };
        }

        return serviceAccum;
      }, {});
    }
  };

  const serviceSchema: ServiceSchema = {
    name,
    methods,
    events,
    created() {
      this.apolloServer = null;
      this.graphqlHandler = null;

      const route = {
        ...mixinOptions.routeOptions,
        ...{
          aliases: {
            async '/'(req, res) {
              try {
                await this.prepareGraphQLSchema();
                return this.graphqlHandler(req, res);
              } catch (err) {
                this.sendError(req, res, err);
              }
            }
          },

          mappingPolicy: 'restrict',

          bodyParsers: {
            json: true,
            urlencoded: { extended: true }
          }
        }
      };

      // Add route
      this.settings.routes.unshift(route);
    },

    async started(): Promise<any> {
      this.logger.info(
        `🚀 GraphQL server is available at ${mixinOptions.routeOptions.path}`
      );
      return true;
    }
  };
  return serviceSchema;
}
