import { Method, Service } from '@ltv/moleculer-decorators';

@Service({
  name: 'hello'
})
class HelloService {
  @Method
  public hello() {
    //
  }

  public created() {
    this.hello();
  }
}

export = HelloService;
