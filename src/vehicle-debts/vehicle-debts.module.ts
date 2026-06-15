import { Module } from '@nestjs/common';
import { VehicleDebtsController } from './vehicle-debts.controller';
import { VehicleDebtsService } from './vehicle-debts.service';
import { MockProviderAService } from './providers/mock-provider-a.service';
import { MockProviderBService } from './providers/mock-provider-b.service';
import { MockProviderCService } from './providers/mock-provider-c.service';
import { ProviderChainService } from './providers/provider-chain.service';
import { VEHICLE_DEBTS_PROVIDERS } from './interfaces/vehicle-debts-provider.interface';

@Module({
  controllers: [VehicleDebtsController],
  providers: [
    VehicleDebtsService,
    ProviderChainService,
    MockProviderAService,
    MockProviderBService,
    MockProviderCService,
    {
      provide: VEHICLE_DEBTS_PROVIDERS,
      useFactory: (a: MockProviderAService, b: MockProviderBService, c: MockProviderCService) => [a, b, c],
      inject: [MockProviderAService, MockProviderBService, MockProviderCService],
    },
  ],
  exports: [VehicleDebtsService],
})
export class VehicleDebtsModule {}
