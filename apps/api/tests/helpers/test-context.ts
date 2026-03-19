import { Container } from "inversify";
import { PRISMA_TOKEN, prisma } from "@/infrastructure/database/prisma.ts";
import {
  eventsModule,
  HANDLERS,
} from "@/infrastructure/di/modules/events.module.ts";
import { gatewayModule } from "@/infrastructure/di/modules/gateway.module.ts";
import { repositoryModule } from "@/infrastructure/di/modules/repository.module.ts";
import { serviceModule } from "@/infrastructure/di/modules/service.module.ts";
import { useCaseModule } from "@/infrastructure/di/modules/use-case.module.ts";

class RollbackError extends Error {
  constructor() {
    super("__TRANSACTION_ROLLBACK__");
  }
}

/**
 * Creates a test context with automatic transaction management.
 *
 * Usage:
 * ```ts
 * const ctx = createTestContext();
 * beforeEach(ctx.setup);
 * afterEach(ctx.teardown);
 *
 * it("test", async () => {
 *   const useCase = ctx.container.get(RoomUseCase);
 * });
 * ```
 */
export function createTestContext() {
  let _container!: Container;
  let _signalRollback: (() => void) | null = null;
  let _transactionDone: Promise<void> | null = null;

  const setup = async () => {
    const containerReady = Promise.withResolvers<void>();
    const rollbackSignal = Promise.withResolvers<void>();

    _transactionDone = prisma
      .$transaction(
        async (tx) => {
          const container = new Container();

          container.load(
            repositoryModule,
            useCaseModule,
            serviceModule,
            eventsModule,
            gatewayModule,
          );

          container.rebind(PRISMA_TOKEN).toConstantValue(tx);

          for (const handler of HANDLERS) {
            container.get(handler);
          }

          _container = container;
          containerReady.resolve();

          await rollbackSignal.promise;
          throw new RollbackError();
        },
        { timeout: 30_000 },
      )
      .catch((e) => {
        if (!(e instanceof RollbackError)) throw e;
      });

    _signalRollback = () => rollbackSignal.resolve();
    await containerReady.promise;
  };

  const teardown = async () => {
    _signalRollback?.();
    await _transactionDone;
    _signalRollback = null;
    _transactionDone = null;
  };

  return {
    get container(): Container {
      return _container;
    },
    setup,
    teardown,
  };
}
