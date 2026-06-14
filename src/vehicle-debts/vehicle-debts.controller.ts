import {
  BadRequestException,
  Controller,
  Get,
  Param,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VehicleDebtsService } from './vehicle-debts.service';
import { VehicleDebtsResponseDto } from './dto/vehicle-debts-response.dto';

const PLATE_REGEX = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/i;

@ApiTags('Vehicle Debts')
@ApiBearerAuth()
@Controller('vehicle-debts')
export class VehicleDebtsController {
  constructor(private readonly vehicleDebtsService: VehicleDebtsService) {}

  @Get(':plate')
  @ApiOperation({ summary: 'Consulta débitos veiculares com juros e opções de pagamento' })
  @ApiParam({ name: 'plate', example: 'ABC1234', description: 'Placa no formato antigo ou Mercosul' })
  @ApiResponse({ status: 200, type: VehicleDebtsResponseDto })
  @ApiResponse({ status: 400, description: 'Placa inválida' })
  @ApiResponse({ status: 404, description: 'Placa não encontrada' })
  @ApiResponse({ status: 422, description: 'Tipo de débito desconhecido' })
  @ApiResponse({ status: 503, description: 'Todos os provedores indisponíveis' })
  getDebts(@Param('plate') plate: string): Promise<VehicleDebtsResponseDto> {
    if (!PLATE_REGEX.test(plate)) {
      throw new BadRequestException({ error: 'invalid_plate' });
    }
    return this.vehicleDebtsService.getDebtsByPlate(plate);
  }
}
