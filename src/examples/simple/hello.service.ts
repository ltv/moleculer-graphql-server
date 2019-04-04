import { Service } from '@ltv/moleculer-decorators';

@Service({
  name: 'hello'
})
class HelloService {}

export = HelloService;
