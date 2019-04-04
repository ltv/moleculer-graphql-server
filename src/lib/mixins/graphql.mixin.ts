import { ServiceSchema } from 'moleculer';
import { GatewayMixinOptions } from './types';

const defaultGwOpts: GatewayMixinOptions = {
  apollo: undefined,
  routeOptions: {
    path: '/graphql'
  },
  schema: null,
  serverOptions: {},
  subscriptionEventName: 'graphql.publish'
};

export function GraphQLGatewayMixin(
  options: GatewayMixinOptions
): ServiceSchema {
  const useOpts = { ...defaultGwOpts, ...options };
  const { name = 'graphql-gateway' } = useOpts;
  return { name };
}
