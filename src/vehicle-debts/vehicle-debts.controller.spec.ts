import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VehicleDebtsController } from './vehicle-debts.controller';
import { VehicleDebtsService } from './vehicle-debts.service';

const mockResponse = {
  placa: 'ABC1234',
  debitos: [],
  resumo: { total_original: '0.00', total_atualizado: '0.00' },
  pagamentos: { opcoes: [] },
};

describe('VehicleDebtsController', () => {
  let controller: VehicleDebtsController;
  let service: { getDebtsByPlate: jest.Mock };

  beforeEach(async () => {
    service = { getDebtsByPlate: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehicleDebtsController],
      providers: [{ provide: VehicleDebtsService, useValue: service }],
    }).compile();

    controller = module.get(VehicleDebtsController);
  });

  describe('placa válida — formato antigo (AAA0000)', () => {
    it('delega ao service e retorna o resultado', async () => {
      service.getDebtsByPlate.mockResolvedValue(mockResponse);
      const result = await controller.getDebts('ABC1234');
      expect(service.getDebtsByPlate).toHaveBeenCalledWith('ABC1234');
      expect(result).toBe(mockResponse);
    });
  });

  describe('placa válida — formato Mercosul (AAA0A00)', () => {
    it('aceita formato Mercosul e delega ao service', async () => {
      service.getDebtsByPlate.mockResolvedValue(mockResponse);
      await controller.getDebts('ABC1D23');
      expect(service.getDebtsByPlate).toHaveBeenCalledWith('ABC1D23');
    });
  });

  describe('placa inválida', () => {
    it('lança BadRequestException para formato inválido', () => {
      expect(() => controller.getDebts('INVALIDA')).toThrow(BadRequestException);
    });

    it('lança BadRequestException para placa muito curta', () => {
      expect(() => controller.getDebts('AB1')).toThrow(BadRequestException);
    });

    it('lança BadRequestException para string vazia', () => {
      expect(() => controller.getDebts('')).toThrow(BadRequestException);
    });

    it('não chama o service quando a placa é inválida', () => {
      try { controller.getDebts('RUIM'); } catch {}
      expect(service.getDebtsByPlate).not.toHaveBeenCalled();
    });
  });

  describe('erros do service', () => {
    it('propaga NotFoundException quando placa não encontrada', async () => {
      service.getDebtsByPlate.mockRejectedValue(new NotFoundException());
      await expect(controller.getDebts('ABC1234')).rejects.toThrow(NotFoundException);
    });

    it('propaga ServiceUnavailableException quando providers falham', async () => {
      service.getDebtsByPlate.mockRejectedValue(new ServiceUnavailableException());
      await expect(controller.getDebts('ABC1234')).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
