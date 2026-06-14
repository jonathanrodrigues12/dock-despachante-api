import { Module } from '@nestjs/common';
import { GoogleOpenIdService } from './google-openid.service';
@Module({
  providers: [GoogleOpenIdService],
  exports: [GoogleOpenIdService],
})
export class GoogleModule {}
