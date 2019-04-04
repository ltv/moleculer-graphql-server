import { Service } from '@ltv/moleculer-decorators';
import { PostgraphileMixin } from 'moleculer-postgraphile';
import pg from 'pg';
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

@Service({
  name: 'adm',
  mixins: [PostgraphileMixin({ schema: 'adm', pgPool })]
})
class AdmService {}

export = AdmService;
