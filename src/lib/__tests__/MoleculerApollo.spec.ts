import { moleculerApollo } from "../MoleculerApollo";

describe('MoleculerApollo', () => {
  it('Should throw error if not providing options', () => {
    expect(() => {
      moleculerApollo(null);
    }).toThrowError('Apollo Server requires options.');
  });
});
