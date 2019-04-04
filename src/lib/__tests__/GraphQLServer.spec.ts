import { GraphQLServer } from '../../lib/GraphQLServer';

describe('Test GraphQLServer', () => {
  it('Should create instance of GraphQLServer', () => {
    const graphqlServer = new GraphQLServer();
    expect(graphqlServer).toBeTruthy();
  });
});
