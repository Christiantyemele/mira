import neo4j, { Driver, Session } from 'neo4j-driver';

export type GraphConfig = {
  uri: string;
  user: string;
  password: string;
  database?: string; // optional named database
};

export type FileNodeProps = Record<string, any>;

/**
 * GraphAdapter provides a thin wrapper around a Neo4j driver/session for simple file graph operations.
 * Driver instantiation is hidden behind createDriver() to allow tests to inject a mock driver.
 */
export class GraphAdapter {
  protected cfg: GraphConfig;
  protected driver?: Driver;
  protected session?: Session;

  constructor(cfg: GraphConfig) {
    this.cfg = cfg;
  }

  /**
   * Create the Neo4j Driver. Tests can override this to provide a mock.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected createDriver(cfg: GraphConfig): Driver {
    return neo4j.driver(cfg.uri, neo4j.auth.basic(cfg.user, cfg.password));
  }

  /** Connect by creating a driver and a session */
  async connect(): Promise<void> {
    if (!this.driver) {
      this.driver = this.createDriver(this.cfg);
    }
    if (!this.session) {
      this.session = this.cfg.database
        ? this.driver.session({ database: this.cfg.database })
        : this.driver.session();
    }
  }

  /** Close session and driver */
  async close(): Promise<void> {
    const promises: Promise<unknown>[] = [];
    if (this.session) {
      promises.push(this.session.close());
      this.session = undefined;
    }
    if (this.driver) {
      promises.push(this.driver.close());
      this.driver = undefined;
    }
    await Promise.all(promises);
  }

  private ensureSession(): asserts this is this & { session: Session } {
    if (!this.session) {
      throw new Error('GraphAdapter not connected. Call connect() first.');
    }
  }

  /**
   * Upsert (merge) a File node keyed by path, and set/merge its properties.
   */
  async upsertFileNode(path: string, props: FileNodeProps = {}): Promise<void> {
    this.ensureSession();
    const cypher = 'MERGE (f:File {path: $path}) SET f += $props RETURN f';
    const params = { path, props };
    await this.session.run(cypher, params);
  }

  /**
   * Create or merge a relationship between two File nodes identified by their path values.
   * Relation type must be a valid Cypher relationship type: [A-Z_][A-Z0-9_]*
   */
  async createRelation(fromId: string, toId: string, type: string): Promise<void> {
    this.ensureSession();
    const relType = this.normalizeRelType(type);
    const cypher = `MATCH (a:File {path: $fromId}), (b:File {path: $toId}) MERGE (a)-[:${relType}]->(b)`;
    const params = { fromId, toId };
    await this.session.run(cypher, params);
  }

  /**
   * Query neighbors up to a given depth from a File node identified by path. Returns raw Neo4j results.
   */
  async queryNeighbors(nodeId: string, depth = 1) {
    this.ensureSession();
    const d = Math.max(1, Math.floor(depth));
    const cypher = `MATCH (n:File {path: $nodeId})-[*1..${d}]-(m) RETURN DISTINCT m`;
    const params = { nodeId };
    const res = await this.session.run(cypher, params);
    return res;
  }

  private normalizeRelType(type: string): string {
    const t = (type || '').toUpperCase();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(t)) {
      throw new Error(`Invalid relationship type: ${type}`);
    }
    return t;
  }
}
