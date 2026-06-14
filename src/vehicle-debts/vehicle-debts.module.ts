import { Module } from '@nestjs/common';
import { VehicleDebtsController } from './vehicle-debts.controller';
import { VehicleDebtsService } from './vehicle-debts.service';
import { MockProviderAService } from './providers/mock-provider-a.service';
import { MockProviderBService } from './providers/mock-provider-b.service';
import { ProviderChainService } from './providers/provider-chain.service';
import { VEHICLE_DEBTS_PROVIDERS } from './interfaces/vehicle-debts-provider.interface';

@Module({
  controllers: [VehicleDebtsController],
  providers: [
    VehicleDebtsService,
    ProviderChainService,
    MockProviderAService,
    MockProviderBService,
    {
      provide: VEHICLE_DEBTS_PROVIDERS,
      useFactory: (a: MockProviderAService, b: MockProviderBService) => [a, b],
      inject: [MockProviderAService, MockProviderBService],
    },
  ],
  exports: [VehicleDebtsService],
})
export class VehicleDebtsModule {}
