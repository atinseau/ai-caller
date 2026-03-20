import { ContainerModule } from "inversify";
import { CompanyUseCase } from "@/application/use-cases/company.use-case.ts";
import { PhoneNumberUseCase } from "@/application/use-cases/phone-number.use-case.ts";
import { RoomUseCase } from "@/application/use-cases/room.use-case.ts";
import { TelephonyUseCase } from "@/application/use-cases/telephony.use-case.ts";

export const useCaseModule = new ContainerModule((module) => {
  module.bind(CompanyUseCase).toSelf().inSingletonScope();
  module.bind(RoomUseCase).toSelf().inSingletonScope();
  module.bind(TelephonyUseCase).toSelf().inSingletonScope();
  module.bind(PhoneNumberUseCase).toSelf().inSingletonScope();
});
