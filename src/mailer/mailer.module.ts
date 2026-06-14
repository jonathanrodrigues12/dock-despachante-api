import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EnvModule } from '../env/env.module';
import { EnvService } from '../env/env.service';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [EnvModule],
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        defaults: {
          from: env.get('EMAIL_USERNAME'),
        },
        transport: {
          host: env.get('EMAIL_HOST'),
          port: env.get('EMAIL_PORT'),
          secure: true,
          auth: {
            user: env.get('EMAIL_USERNAME'),
            pass: env.get('EMAIL_PASSWORD'),
          },
        },
        template: {
          dir: join(process.cwd(), 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      }),
    }),
  ],
  exports: [MailerModule],
})
export class CustomMailerModule {}
