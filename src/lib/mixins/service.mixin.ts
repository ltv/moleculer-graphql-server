import { mergeString } from "@ltv/gql-merge";
import { DocumentNode, graphql, GraphQLSchema, print } from "graphql";
import { makeExecutableSchema } from "graphql-tools";
import isString from 'lodash.isstring';
import { Context, ServiceSchema } from "moleculer";

export interface GraphQLServiceCacheOptions {
  cacheSchema?: {
    prefix?: string;
    name?: string;
  };
  cacheResult?: {
    enable: boolean;
    ttl?: number;
  }
}

export interface GraphQLServiceMixinOptions {
  schema: string | DocumentNode;
  action?: string;
  cache?: GraphQLServiceCacheOptions;
}

const defaultOptions: GraphQLServiceMixinOptions = {
  schema: null,
  action: 'graphql',
  cache: {
    cacheSchema: null,
    cacheResult: {
      enable: true,
      ttl: 30
    }
  },
};

export const CANNOT_BUILD_GRAPHQL_SCHEMA: string = '[GraphQLServiceMixin] Please define: "schema"';

export function GraphQLServiceMixin(options: GraphQLServiceMixinOptions) {
  const opts = { ...defaultOptions, ...options };
  const { schema, action } = opts;
  if (!schema) {
    throw new Error(CANNOT_BUILD_GRAPHQL_SCHEMA);
  }

  let gqlSchema: GraphQLSchema = null;
  let shouldUpdateSchema = true;
  let resolvers = {};

  const methods = {
    async prepareGraphQLSchema(): Promise<void> {
      if (!shouldUpdateSchema) {
        return;
      }
      this.logger.info('♻ Regenerate GraphQL schema...');
      if (isString(schema)) {
        gqlSchema = makeExecutableSchema({ typeDefs: schema });
      } else {
        const schemaString = mergeString(print(schema as DocumentNode));
        gqlSchema = makeExecutableSchema({ typeDefs: schemaString });
      }
      shouldUpdateSchema = false;
    }
  }

  const serviceSchema: ServiceSchema = {
    name: '',
    actions: {
      [action]: {
        params: {
          query: { type: 'string' },
          variables: { type: 'object', optional: true }
        },
        async handler(ctx: Context): Promise<any> {
          await this.prepareGraphQLSchema();
          const { query, variables, operationName } = ctx.params;
          return graphql(gqlSchema, query, resolvers, ctx, variables, operationName);
        }
      }
    },
    methods,

    created() {
      const graphQLMethods = this.getGQLMethods && this.getGQLMethods() || {};
      resolvers = Object.keys(graphQLMethods)
        .reduce((carryTypes: any, type: string) => {
          const typeResolvers = Object.keys(graphQLMethods[type]).reduce((carryMets: any, key) => {
            const resolver = graphQLMethods[type][key].bind(this);
            return { ...carryMets, [key]: resolver };
          }, {})
          return { ...carryTypes, ...typeResolvers };
        }, {});
    }
  };
  return serviceSchema;
}
