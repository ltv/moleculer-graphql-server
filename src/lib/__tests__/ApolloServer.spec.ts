import { ApolloServer } from '../ApolloServer';
import ApiGwService from 'moleculer-web';
import { makeExecutableSchema } from 'graphql-tools';
import { ServiceBroker } from 'moleculer';
import { PostgraphileMixin } from 'moleculer-postgraphile';
import { Pool } from 'pg';
import { GatewayMixin } from '../mixins';
import request from 'request-promise';
import { SchemaBuilderContext } from '../utils';
import { GraphQLSchema, buildClientSchema } from 'graphql';

describe('ApolloServer', () => {
  const schema = makeExecutableSchema({
    typeDefs: `
      type Query {
        hello: String!
      }
    `,
    resolvers: {
      Query: {
        hello: () => 'Hello World!'
      }
    }
  });

  it('Should create apollo server instance', () => {
    const apollo = new ApolloServer({ schema });
    expect(apollo).toBeTruthy();
  });

  it('Should supportsUploads', () => {
    expect.assertions(2);
    const apollo = new ApolloServer({ schema });
    expect(apollo.supportsUploads).toBeInstanceOf(Function);
    expect(apollo.supportsUploads()).toEqual(true);
  });

  it('Should supportsSubscriptions', () => {
    expect.assertions(2);
    const apollo = new ApolloServer({ schema });
    expect(apollo.supportsSubscriptions).toBeInstanceOf(Function);
    expect(apollo.supportsSubscriptions()).toEqual(true);
  });

  describe('Test Integration with service', () => {
    const broker = new ServiceBroker({
      logger: false,
      cacher: 'Memory'
    });

    // Create services (S)
    const admSchema = {
      name: 'adm',
      mixins: [
        PostgraphileMixin({
          schema: 'adm',
          pgPool: new Pool({
            connectionString: process.env.DATABASE_URL
          })
        })
      ]
    };

    const pimSchema = {
      name: 'pim',
      mixins: [
        PostgraphileMixin({
          schema: 'pim',
          pgPool: new Pool({
            connectionString: process.env.DATABASE_URL
          })
        })
      ]
    };

    const gatewaySchema = {
      name: 'api',
      mixins: [ApiGwService, GatewayMixin({ apollo: true })],
      settings: {
        port: 8080
      }
    };

    broker.createService(gatewaySchema);
    broker.createService(admSchema);
    broker.createService(pimSchema);
    // Create services (E)

    // options (S)
    const requestOpts = {
      resolveWithFullResponse: true,
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'Content-Type': 'application/json'
      }
    };

    const graphqlEnpoint = 'http://localhost:8080/graphql';
    // options (E)

    beforeAll(() => broker.start());
    afterAll(() => broker.stop());

    it('Should render graphiql page with route /graphql', async () => {
      expect.assertions(2);
      const res = await request(graphqlEnpoint, requestOpts);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toBeTruthy();
    });

    it('Should return data with graphql query', async () => {
      expect.assertions(2);
      const params = {
        operationName: null,
        variables: {},
        query: `
          {
            allPimPjts {
              nodes {
                id
                name
                description
              }
            }
          }
        `
      };
      const res = await request(graphqlEnpoint, {
        ...requestOpts,
        method: 'POST',
        json: true,
        body: params
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toMatchObject({
        data: {
          allPimPjts: {
            nodes: expect.any(Array)
          }
        }
      });
    });

    it('Should throw Error if not providing correct header', async () => {
      try {
        await request(graphqlEnpoint, {
          resolveWithFullResponse: true
        });
      } catch (e) {
        expect(e.statusCode).toEqual(500);
      }
    });

    it('Should throw Error if not providing correct query', async () => {
      try {
        const params = {
          operationName: null,
          variables: {},
          query: `
            query {
            }
          `
        };
        await request(graphqlEnpoint, {
          ...requestOpts, method: 'POST',
          json: true,
          body: params
        });
      } catch (e) {
        expect(e.statusCode).toEqual(500);
      }
    });
  });

  describe('Test Integration with service --- WITH CUSTOM BUILDER', () => {
    const broker = new ServiceBroker({
      logger: false,
      cacher: 'Memory'
    });

    // Create services (S)
    const admSchema = {
      name: 'adm',
      mixins: [
        PostgraphileMixin({
          schema: 'adm',
          pgPool: new Pool({
            connectionString: process.env.DATABASE_URL
          })
        })
      ]
    };

    const pimSchema = {
      name: 'pim',
      mixins: [
        PostgraphileMixin({
          schema: 'pim',
          pgPool: new Pool({
            connectionString: process.env.DATABASE_URL
          })
        })
      ]
    };

    const schemaBuilder = async ({
      broker,
      service
    }: SchemaBuilderContext): Promise<GraphQLSchema> => {
      const schemaFromCache = await broker.cacher.get(
        `graphile.schema.${service.name}`
      );
      return buildClientSchema(schemaFromCache as any);
    };

    const gatewaySchema = {
      name: 'api',
      mixins: [ApiGwService, GatewayMixin({ apollo: true, schemaBuilder })],
      settings: {
        port: 8080
      }
    };

    broker.createService(gatewaySchema);
    broker.createService(admSchema);
    broker.createService(pimSchema);
    // Create services (E)

    // options (S)
    const requestOpts = {
      resolveWithFullResponse: true,
      headers: {
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'Content-Type': 'application/json'
      }
    };

    const graphqlEnpoint = 'http://localhost:8080/graphql';
    // options (E)

    beforeAll(() => broker.start());
    afterAll(() => broker.stop());

    it('Should return data with graphql query - API Gateway without SchemaBuilder (Default Builder)', async () => {
      expect.assertions(2);
      const params = {
        operationName: null,
        variables: {},
        query: `
          query {
            allPimPjts {
              nodes {
                id
                name
                description
              }
            }
          }
        `
      };
      const res = await request(graphqlEnpoint, {
        ...requestOpts,
        method: 'POST',
        json: true,
        body: params
      });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toMatchObject({
        data: {
          allPimPjts: {
            nodes: expect.any(Array)
          }
        }
      });
    });
  });
});
