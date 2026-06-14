import { Module } from '@nestjs/common';
import { VehicleDebtsController } from './vehicle-debts.controller';
import { VehicleDebtsService } from './vehicle-debts.service';
import { MockProviderAService } from './providers/mock-provider-a.service';
import { VEHICLE_DEBTS_PROVIDER } from './interfaces/vehicle-debts-provider.interface';

@Module({
  controllers: [VehicleDebtsController],
  providers: [
    VehicleDebtsService,
    {
      provide: VEHICLE_DEBTS_PROVIDER,
      useClass: MockProviderAService,
    },
  ],
  exports: [VehicleDebtsService],
})
export class VehicleDebtsModule {}
