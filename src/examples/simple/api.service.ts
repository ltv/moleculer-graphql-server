import { Service } from '@ltv/moleculer-decorators';
import { buildClientSchema, GraphQLSchema } from 'graphql';
import ApiGwService from 'moleculer-web';
import { GatewayMixin } from '../../lib/mixins';
import { SchemaBuilderContext } from '../../lib/utils';

const schemaBuilder = async ({
  broker,
  service
}: SchemaBuilderContext): Promise<GraphQLSchema> => {
  const schemaFromCache = await broker.cacher.get(
    `graphile.schema.${service.name}`
  );
  return buildClientSchema(schemaFromCache as any);
};

@Service({
  name: 'api',
  mixins: [
    ApiGwService,
    GatewayMixin({
      apollo: true,
      schemaBuilder
    })
  ],
  settings: {
    port: 8080
  }
})
class ApiService { }

export = ApiService;
