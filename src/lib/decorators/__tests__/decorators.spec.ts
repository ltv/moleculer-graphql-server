import { GQLResolver } from '../index';
import { Service } from '@ltv/moleculer-decorators';
import { ServiceBroker } from 'moleculer';

@Service({
  name: 'test-decorator'
})
class TestService {

  @GQLResolver({ name: 'hello', type: 'Query' })
  hello() {
    return { name: 'Test' };
  }

  @GQLResolver({ name: 'createHelloWithNewName', type: 'Mutation' })
  createHello() {
    return { name: 'Test' };
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
}

describe('Decorators', () => {
  const broker = new ServiceBroker({
    logger: false
  });

  const service = broker.createService(TestService);

  beforeAll(() => broker.start());
  afterAll(() => broker.stop());

  it('Should add methods to service', () => {
    expect.assertions(2);
    expect(service).toBeTruthy();
    const resolvers = service.getGQLMethods();
    expect(resolvers).toMatchObject({
      Query: {
        hello: expect.any(Function),
        defaultResolver: expect.any(Function),
        provideOnlyType: expect.any(Function),
      },
      Mutation: {
        createHelloWithNewName: expect.any(Function)
      },
      CustomType: {
        customType: expect.any(Function)
      }
    })
  });
});
