import { CronJob, type CronJobParams } from "cron";
import { RoomUseCase } from "@/application/use-cases/room.use-case.ts";
import { CronEnum } from "@/interfaces/enums/cron.enum.ts";
import { container } from "../di/container.ts";
import { logger } from "../logger/index.ts";

const registeredCronJobs: CronJob[] = [];

const cronJobsToRegister: CronJobParams[] = [
  {
    name: CronEnum.FLUSH_EXPIRED_ROOMS,
    cronTime: "*/1 * * * * *",
    waitForCompletion: true,
    start: true,
    onTick: async () => {
      const roomUseCase = container.get(RoomUseCase);
      await roomUseCase.flushExpiredRooms();
    },
  },
];

for (const cron of Object.values(CronEnum)) {
  // If the cron job is already registered, skip it
  if (registeredCronJobs.find((job) => job.name === cron)) {
    continue;
  }

  const cronJobParams = cronJobsToRegister.find((job) => job.name === cron);
  if (!cronJobParams) {
    logger.warn(`No cron job params found for cron: ${cron}`);
    continue;
  }

  const cronJob = CronJob.from(cronJobParams);
  registeredCronJobs.push(cronJob);
  logger.info(`Registered cron job: ${cron}`);
}
