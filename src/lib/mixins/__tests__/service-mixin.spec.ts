import { GQLResolver } from '../../decorators/index';
import { Service, Action } from '@ltv/moleculer-decorators';
import { ServiceBroker, Context } from 'moleculer';
import { GraphQLServiceMixin, CANNOT_BUILD_GRAPHQL_SCHEMA } from '../service.mixin';
import { introspectionQuery } from 'graphql';
import schema from './graphql/schema.gql';

@Service({
  name: 'test',
  mixins: [GraphQLServiceMixin({ schema })]
})
class TestService {

  @GQLResolver({ name: 'hello', type: 'Query' })
  hello() {
    return { name: 'Hello' };
  }

  @GQLResolver({ name: 'createHelloWithNewName', type: 'Mutation' })
  createHello() {
    return { name: 'createHelloWithNewName' };
  }

  @GQLResolver()
  defaultResolver() {
    return 'defaultResolver';
  }

  @GQLResolver({ type: 'Query' })
  provideOnlyType() {
    return 'provideOnlyType';
  }

  @GQLResolver({ type: 'CustomType' })
  customType() {
    return 'customType';
  }

  @GQLResolver({ type: 'Mutation' })
  async createUser(params: any) {
    const { id, name } = params;
    return { id, name };
  }

  @GQLResolver({ type: 'Mutation' })
  addFromOtherService(params: any, ctx: Context) {
    const { input } = params;
    return ctx.call('math.add', input);
  }
}

@Service({
  name: 'test-ss',
  mixins: [GraphQLServiceMixin({
    schema: `
      type Query {
        hello: String!
      }
  ` })]
})
class TestStringSchemaService {
  @GQLResolver({ name: 'hello', type: 'Query' })
  hello() {
    return 'TestStringSchemaService';
  }
}

@Service({
  name: 'test-ss',
  mixins: [GraphQLServiceMixin({
    schema: `
      type Query {
        hello: String!
      }
  ` })]
})
class EmptyResolverService {

}

@Service({
  name: 'math'
})
class MathService {
  @Action({
    params: {
      num1: 'number',
      num2: 'number'
    }
  })
  public add(ctx: Context) {
    const { num1, num2 } = ctx.params;
    return num1 + num2;
  }
}

describe('Service Mixin', () => {
  const broker = new ServiceBroker({
    logger: false
  });

  broker.createService(MathService);
  const service = broker.createService(TestService);
  broker.createService(TestStringSchemaService);
  broker.createService(EmptyResolverService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  it('Should create service with mixin', () => {
    expect(service).toBeTruthy();
  });

  it('Should throw error if not providing schema', () => {
    expect(() => {
      GraphQLServiceMixin({ schema: null });
    }).toThrowError(CANNOT_BUILD_GRAPHQL_SCHEMA);
  });

  it('Should create Mixin with provided string schema', async () => {
    const helloRes = await broker.call('test-ss.graphql', { query: 'query { hello }' });
    const { data } = helloRes;
    expect(data).toMatchObject({
      hello: 'TestStringSchemaService'
    });
  });

  it('Should build graphql success and inspect correctly', async () => {
    const inspectedSchema = await broker.call('test.graphql', { query: introspectionQuery });
    expect(inspectedSchema.data).toMatchObject({
      __schema: expect.any(Object)
    });
  });

  it('Should call graphql and return correct response', async () => {
    const helloRes = await broker.call('test.graphql', { query: 'query { hello { name } }' });
    const { data } = helloRes;
    expect(data).toMatchObject({
      hello: {
        name: 'Hello'
      }
    });
  });

  it('Should call mutation', async () => {
    const res = await broker.call('test.graphql', { query: 'mutation { created: createHelloWithNewName { name } }' });
    const { data } = res;
    expect(data).toMatchObject({
      created: {
        name: 'createHelloWithNewName'
      }
    });
  });

  it('Should call mutation with variables', async () => {
    const res = await broker.call('test.graphql', {
      query: `
        mutation createUser($id: Int!, $name: String!) { 
          user: createUser(id: $id, name: $name) { 
            id
            name
          }
        }
      `,
      variables: { id: 1, name: 'Luc Duong' }
    });
    const { data } = res;
    expect(data).toMatchObject({
      user: { id: 1, name: 'Luc Duong' }
    });
  });

  it('Should call with other service', async () => {
    const res = await broker.call('test.graphql', {
      query: `
        mutation addFromOtherService($input: AddInput!) { 
          sum: addFromOtherService(input: $input)
        }
      `,
      variables: {
        input: { num1: 1, num2: 1 }
      }
    });
    const { data } = res;
    expect(data).toMatchObject({
      sum: 1 + 1
    });
  });
});
