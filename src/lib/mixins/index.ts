import { ServiceSchema } from 'moleculer';
import { ApolloGatewayMixin } from './apollo.mixin';
import { GraphQLGatewayMixin } from './graphql.mixin';
import { GatewayMixinOptions } from './types';

const defaultGwOpts: GatewayMixinOptions = {
  apollo: false,
  routeOptions: {
    path: '/graphql'
  },
  schema: null,
  serverOptions: {},
  subscriptionEventName: 'graphql.publish'
};

export function GatewayMixin(options: GatewayMixinOptions): ServiceSchema {
  const useOpts = { ...defaultGwOpts, ...options };
  const { apollo } = useOpts;
  return apollo ? ApolloGatewayMixin(options) : GraphQLGatewayMixin(options);
}

export * from './apollo.mixin';
export * from './graphql.mixin';
