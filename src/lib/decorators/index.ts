const TYPE_QUERY = 'Query';
// const TYPE_MUTATION = 'Mutation';

export interface ResolverOptions {
  name?: string;
  type?: string; // Query | Mutation | CustomTypeName
}

export function GQLResolver(options?: ResolverOptions) {

  const { name = null, type = TYPE_QUERY } = options || {};

  // tslint:disable-next-line: only-arrow-functions
  return function (target: any, key: any, descriptor: any) {
    const { getGQLMethods: gqlMets } = target.methods || (target.methods = {});

    const graphQLMethods = {
      ...((gqlMets && gqlMets()) || {}),
    };

    graphQLMethods[type] = {
      ...(graphQLMethods[type] || {}),
      [name || key]: descriptor.value
    };
    target.methods.getGQLMethods = () =>
      graphQLMethods;
  }
}
