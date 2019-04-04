import {
  ApolloGatewayMixin,
  GraphQLGatewayMixin,
  GatewayMixin
} from '../index';

describe('Test mixnis', () => {
  const basicSchema = {
    name: expect.any(String),
    created: expect.any(Function),
    started: expect.any(Function),
    events: expect.any(Object),
    methods: expect.any(Object)
  };

  it('Should export ApolloGatewayMixin & GraphQLGatewayMixin & GatewayMixin', () => {
    expect.assertions(3);
    expect(ApolloGatewayMixin).toBeInstanceOf(Function);
    expect(GraphQLGatewayMixin).toBeInstanceOf(Function);
    expect(GatewayMixin).toBeInstanceOf(Function);
  });

  it('Should return correct GraphQLGatewayMixin', () => {
    const graphqlSchema = GatewayMixin({});
    expect(graphqlSchema).toEqual({
      // ...basicSchema,
      name: 'graphql-gateway'
    });
  });

  it('Should return correct ApolloGatewayMixin', () => {
    const graphqlSchema = GatewayMixin({ apollo: {} });
    expect(graphqlSchema).toEqual({
      ...basicSchema,
      name: 'apollo-gateway'
    });
  });

  it('Should return correct instance of GatewayMixin', () => {
    expect.assertions(2);
    const apolloSchema = GatewayMixin({ apollo: {} });
    const graphqlSchema = GatewayMixin({});

    expect(apolloSchema).toEqual({
      ...basicSchema,
      name: 'apollo-gateway'
    });

    expect(graphqlSchema).toEqual({
      // ...basicSchema,
      name: 'graphql-gateway'
    });
  });
});
