import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import cookieParser = require('cookie-parser');
import basicAuth = require('express-basic-auth');
import { ErrorMessage } from './common/error-message-base';
import { PaginationResponse } from './common/paginations/paginationResponse';
import { ParamsPagination } from './common/paginations/params-pagination';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // 🔐 Ativa o interceptor global pra aplicar @Exclude/@Expose automaticamente
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 🔐 Swagger authentication
  app.use(
    ['/api/docs', '/api/docs-json'],
    basicAuth({
      challenge: true,
      users: { admin: 'Going2!@Swagger2026' },
    }),
  );

  // 🧾 Swagger config
  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Backend API for management system.')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [PaginationResponse, ParamsPagination, ErrorMessage],
  });
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT || 3000);

  Logger.log('Server is running http://localhost:' + (process.env.PORT || 3000) + '/api/docs');
}
bootstrap();
