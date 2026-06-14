import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VehicleDebtsService } from './vehicle-debts.service';
import { VehicleDebtsResponseDto } from './dto/vehicle-debts-response.dto';

@ApiTags('Vehicle Debts')
@ApiBearerAuth()
@Controller('vehicle-debts')
export class VehicleDebtsController {
  constructor(private readonly vehicleDebtsService: VehicleDebtsService) {}

  @Get(':plate')
  @ApiOperation({ summary: 'Consulta débitos veiculares por placa (Provedor A)' })
  @ApiParam({ name: 'plate', example: 'ABC1234' })
  @ApiResponse({ status: 200, type: VehicleDebtsResponseDto })
  @ApiResponse({ status: 404, description: 'Placa não encontrada' })
  getDebts(@Param('plate') plate: string): Promise<VehicleDebtsResponseDto> {
    return this.vehicleDebtsService.getDebtsByPlate(plate);
  }
}
