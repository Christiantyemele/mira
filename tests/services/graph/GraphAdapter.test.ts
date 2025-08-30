import { GraphAdapter, GraphConfig } from '../../../services/graph/GraphAdapter';
import type { Driver, Session } from 'neo4j-driver';

describe('GraphAdapter', () => {
  let mockSession: jest.Mocked<Session>;
  let mockDriver: jest.Mocked<Driver>;

  class TestGraphAdapter extends GraphAdapter {
    protected createDriver(cfg: GraphConfig): Driver {
      // return the mocked driver for tests
      return (mockDriver as unknown) as Driver;
    }
  }

  beforeEach(() => {
    // Create fresh mocks for each test
    mockSession = {
      run: jest.fn().mockResolvedValue({} as any),
      close: jest.fn().mockResolvedValue(undefined as any),
    } as any;

    mockDriver = {
      session: jest.fn(() => mockSession),
      close: jest.fn().mockResolvedValue(undefined as any),
    } as any;
  });

  it('calls session.run with correct Cypher for upsertFileNode', async () => {
    const adapter = new TestGraphAdapter({ uri: 'bolt://localhost', user: 'u', password: 'p' });
    await adapter.connect();

    const path = '/foo/bar.ts';
    const props = { label: 'File', size: 123 };
    await adapter.upsertFileNode(path, props);

    expect(mockDriver.session).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledWith(
      'MERGE (f:File {path: $path}) SET f += $props RETURN f',
      { path, props }
    );

    await adapter.close();
    expect(mockSession.close).toHaveBeenCalledTimes(1);
    expect(mockDriver.close).toHaveBeenCalledTimes(1);
  });

  it('calls session.run with correct Cypher for createRelation', async () => {
    const adapter = new TestGraphAdapter({ uri: 'bolt://localhost', user: 'u', password: 'p' });
    await adapter.connect();

    const fromId = '/a.ts';
    const toId = '/b.ts';
    const type = 'imports'; // should be normalized to IMPORTS

    await adapter.createRelation(fromId, toId, type);

    expect(mockSession.run).toHaveBeenCalledTimes(1);
    expect(mockSession.run).toHaveBeenCalledWith(
      'MATCH (a:File {path: $fromId}), (b:File {path: $toId}) MERGE (a)-[:IMPORTS]->(b)',
      { fromId, toId }
    );

    await adapter.close();
  });
});
