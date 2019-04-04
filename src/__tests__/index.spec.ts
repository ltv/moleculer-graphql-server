import { ApolloServer } from '../index';

describe(`>> index <<`, () => {
  it('Should export ApolloServer', () => {
    expect(ApolloServer).toBeInstanceOf(Object);
  });
});
