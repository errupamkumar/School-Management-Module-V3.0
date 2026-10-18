// Mock Prisma Client for UI-only mode
class MockPrismaClient {
  constructor() {
    return new Proxy(this, {
      get: (target, prop) => {
        if (prop === '$connect' || prop === '$disconnect') {
          return () => Promise.resolve();
        }
        return new Proxy({}, {
          get: () => () => Promise.resolve([])
        });
      }
    });
  }
}

export const prisma = new MockPrismaClient() as any;
export default prisma;
