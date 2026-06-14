# API Backend

## Sumário

- [Sobre o Projeto](#sobre-o-projeto)
- [Padrões e Convenções](#padrões-e-convenções)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Google OAuth](#google-oauth)
- [Scripts](#scripts)
- [Padrão de Commits](#padrão-de-commits)
- [Padrão de Rotas](#padrão-de-rotas)
- [Swagger](#swagger)
- [Licença](#licença)
- [Documentação Técnica](#documentação-técnica)

---

## Sobre o Projeto

API backend para gestão de usuários, autenticação, permissões e envio de e-mails, construída com NestJS, TypeORM, PostgreSQL e CASL.

---

## Padrões e Convenções

- **Linguagem:** TypeScript
- **Framework:** NestJS
- **ORM:** TypeORM
- **Validação:** class-validator
- **Autenticação:** JWT (Bearer Token)
- **Documentação:** Swagger (OpenAPI)
- **Lint/Format:** Biome, Prettier, ESLint (Airbnb)
- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)

### Estrutura de Pastas

```
src/
  auth/           # Autenticação e login
  users/          # Usuários, DTOs, entidades, repositórios
  code-validations/ # Validação de códigos (ex: e-mail)
  mailer/         # Envio de e-mails
  common/         # Utilitários, enums, helpers
  casl/           # Controle de permissões (CASL)
  database/       # Configuração do banco
  jwt/            # Estratégias e decorators JWT
```

### Convenções de Código

- Use `PascalCase` para classes e entidades.
- Use `camelCase` para variáveis e métodos.
- DTOs terminam com `Dto` (ex: `CreateUserDto`).
- Controllers terminam com `Controller`.
- Services terminam com `Service`.
- Use decorators do NestJS para validação e autenticação.

---

## Instalação

```bash
git clone <repo>
cd api-backend
npm install
```

---

## Configuração

Crie um arquivo `.env` na raiz com as variáveis necessárias:

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=erp_igreja
JWT_SECRET=your_jwt_secret
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your@email.com
EMAIL_PASSWORD=yourpassword
```

---

## Google OAuth

2.  Crie um Client ID na Google Console:
    Vá em https://console.cloud.google.com/

Crie um projeto ou selecione um existente

Vá em APIs e serviços > Credenciais

Clique em Criar credencial > ID do cliente OAuth

Tipo de aplicativo: Aplicativo da Web

Adicione o URI de redirecionamento (ex: http://localhost:3000/auth/google/redirect)

Para criar o secretkey, siga as instruções da Google Console ao criar o OAuth Client ID.

---

## Scripts

- `npm run start:dev` — inicia em modo desenvolvimento
- `npm run build` — build do projeto
- `npm run test` — executa testes
- `npm run format` — formata o código com Biome
- `npm run lint` — lint do código
- `npm run seed` — roda os seeders (/src/database/run-seeder.ts)

---

## Padrão de Commits

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `chore:` Tarefas de manutenção
- `docs:` Documentação
- `refactor:` Refatoração de código
- `test:` Testes

Exemplo:

```
feat(user): add user registration endpoint
```

---

## Padrão de Rotas

- Todas as rotas protegidas usam Bearer Token (`Authorization: Bearer <token>`)
- Use o botão "Authorize" no Swagger para autenticar

---

## Swagger

Acesse a documentação interativa em:  
`http://localhost:3000/api/docs`

---

## Licença

Este projeto é privado e não possui licença aberta.

---

## Documentação Técnica

Este projeto é uma API backend para um sistema de gestão de igreja, construída com NestJS, TypeORM, PostgreSQL e CASL para permissões. Abaixo você encontrará detalhes técnicos para ajudar qualquer desenvolvedor a entender e contribuir para a base de código.

---

### Visão Geral da Arquitetura

- **Framework:** [NestJS](https://nestjs.com/) (modular, injeção de dependência, escalável)
- **Banco de Dados:** PostgreSQL (via TypeORM)
- **Autenticação:** JWT (Bearer Token)
- **Autorização:** CASL (baseada em função e política)
- **Email:** Nodemailer via @nestjs-modules/mailer
- **Validação:** class-validator, class-transformer
- **Docs da API:** Swagger (OpenAPI)

---

### Principais Pastas & Responsabilidades

- `src/auth/` — Lógica de autenticação, login, estratégia JWT, Google OAuth
- `src/users/` — Entidade de usuário, DTOs, serviço, controlador, repositório
- `src/code-validations/` — Validação de código para ações do usuário (ex: verificação de e-mail)
- `src/mailer/` — Módulo e configuração de envio de e-mails
- `src/common/` — Utilitários compartilhados, enums, helpers, classes base
- `src/casl/` — Sistema de permissões (CASL), guards, fábrica de habilidades
- `src/database/` — Conexão e provedores do banco de dados
- `src/jwt/` — Decoradores, guards e helpers JWT
- `src/storage/` — Serviços de armazenamento (GCP, S3), processamento de imagens e compressão

---

### Principais Convenções

- **DTOs:** Todos os objetos de transferência de dados terminam com `Dto` (ex: `CreateUserDto`).
- **Controllers:** Terminam com `Controller` e são responsáveis pela camada HTTP.
- **Services:** Terminam com `Service` e contêm a lógica de negócio.
- **Repositories:** Repositórios personalizados para consultas e lógica avançadas.
- **Guards:** Usados para autenticação e autorização (ex: `PoliciesGuard`).
- **Decorators:** Decoradores personalizados para rotas públicas, políticas, etc.

---

### Autenticação & Autorização

- **JWT:** Todas as rotas protegidas requerem um token Bearer no cabeçalho `Authorization`.
- **CASL:** As permissões são definidas em `casl-ability.factory.ts` e aplicadas via `PoliciesGuard` e decorador `@CheckPolicies`.
- **Swagger:** Use o botão "Authorize" para definir seu JWT para testar endpoints protegidos.

---

### Variáveis de Ambiente

Toda a configuração sensível é gerenciada via arquivo `.env`. Exemplo:

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=erp_igreja
JWT_SECRET=your_jwt_secret
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USERNAME=your@email.com
EMAIL_PASSWORD=yourpassword

# Storage Configuration
STORAGE_TYPE=s3
IMAGE_QUALITY=80
IMAGE_COMPRESSION_ENABLED=true

# AWS S3 (se STORAGE_TYPE=s3)
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name

# GCP (se STORAGE_TYPE=gcp)
GCP_PROJECT_ID=your_gcp_project_id
GCP_BUCKET_NAME=your_gcp_bucket_name
GCP_KEY_FILENAME=path/to/credentials.json
```

---

### Configuração do Google OAuth

1. Acesse https://console.cloud.google.com/
2. Crie ou selecione um projeto
3. Vá para APIs & Serviços > Credenciais
4. Clique em "Criar Credenciais" > ID do Cliente OAuth
5. Tipo de aplicativo: Aplicativo Web
6. Adicione o URI de redirecionamento (ex: `http://localhost:3000/auth/google/redirect`)
7. Use o ID e a chave secreta gerados no seu arquivo `.env`

---

### Sistema de Armazenamento e Processamento de Imagens

O boilerplate inclui um sistema completo de upload, compressão e geração de thumbnails para imagens, com suporte para AWS S3 e Google Cloud Storage (GCP).

#### Funcionalidades

- **Compressão automática de imagens**: Reduz o tamanho das imagens durante o upload
- **Geração automática de thumbnails**: Cria versões menores das imagens automaticamente
- **Suporte a múltiplos providers**: AWS S3 e Google Cloud Storage
- **Configurável**: Pode desabilitar compressão se necessário
- **Integração transparente**: Funciona automaticamente nos métodos de criação e edição

#### Configuração

##### AWS S3

1. Configure as variáveis de ambiente no `.env`:
```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name
# Opcional: URL base customizada (ex: CloudFront)
AWS_S3_BASE_URL=https://your-cloudfront-url.com
```

2. Certifique-se de que o bucket S3 está configurado com permissões públicas de leitura (ou use uma política apropriada)

##### Google Cloud Storage (GCP)

1. Crie um projeto no Google Cloud Platform
2. Habilite a API do Cloud Storage
3. Crie um bucket
4. Configure as credenciais de uma das seguintes formas:

   **Opção 1: Arquivo de credenciais JSON**
   ```env
   STORAGE_TYPE=gcp
   GCP_PROJECT_ID=your_project_id
   GCP_BUCKET_NAME=your_bucket_name
   GCP_KEY_FILENAME=path/to/credentials.json
   ```

   **Opção 2: Credenciais como string JSON**
   ```env
   STORAGE_TYPE=gcp
   GCP_PROJECT_ID=your_project_id
   GCP_BUCKET_NAME=your_bucket_name
   GCP_CREDENTIALS={"type":"service_account","project_id":"..."}
   ```

   **Opção 3: Application Default Credentials (ADC)**
   ```env
   STORAGE_TYPE=gcp
   GCP_PROJECT_ID=your_project_id
   GCP_BUCKET_NAME=your_bucket_name
   ```
   Neste caso, o sistema usará as credenciais padrão do ambiente GCP.

#### Configuração de Processamento de Imagens

```env
# Qualidade da imagem (1-100, padrão: 80)
IMAGE_QUALITY=80

# Habilitar compressão (true/false, padrão: true)
IMAGE_COMPRESSION_ENABLED=true
```

#### Como Usar

O sistema está integrado automaticamente nos endpoints de criação e edição de usuários. Ao fazer upload de uma imagem:

1. **Upload via multipart/form-data**: Envie o arquivo no campo `photo`
2. **Processamento automático**: A imagem será:
   - Comprimida (se `IMAGE_COMPRESSION_ENABLED=true`)
   - Redimensionada para máximo de 1920x1920px (mantendo proporção)
   - Convertida para JPEG com qualidade configurável
   - Gerado um thumbnail de 300x300px (crop centralizado)

3. **Armazenamento**: A imagem original e o thumbnail são salvos no storage configurado

#### Exemplo de Uso

**Criar usuário com foto:**
```bash
curl -X POST http://localhost:3000/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "name=John" \
  -F "surname=Doe" \
  -F "email=john@example.com" \
  -F "role=CUSTOMER" \
  -F "photo=@/path/to/image.jpg"
```

**Atualizar foto do usuário:**
```bash
curl -X PUT http://localhost:3000/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@/path/to/new-image.jpg"
```

#### Estrutura do Módulo de Storage

```
src/storage/
  ├── interfaces/
  │   └── storage.interface.ts      # Interface abstrata para serviços de storage
  ├── services/
  │   ├── gcp-storage.service.ts    # Implementação para Google Cloud Storage
  │   ├── s3-storage.service.ts     # Implementação para AWS S3
  │   └── image-processing.service.ts # Serviço de compressão e thumbnails
  └── storage.module.ts             # Módulo NestJS com providers
```

#### Desabilitar Compressão

Se você não quiser comprimir as imagens, configure:

```env
IMAGE_COMPRESSION_ENABLED=false
```

As imagens ainda serão redimensionadas e os thumbnails serão gerados, mas sem compressão adicional.

---

### Execução & Desenvolvimento

- `npm run start:dev` — Inicia em modo de desenvolvimento (auto-reload)
- `npm run build` — Compila o projeto
- `npm run test` — Executa os testes
- `npm run format` — Formata o código com Biome
- `npm run lint` — Analisa o código

---

### Estilo de Commit & Código

- Use [Commits Convencionais](https://www.conventionalcommits.org/)
- Formate e analise antes de enviar
- Mantenha os controllers enxutos, coloque a lógica nos serviços
- Use DTOs para toda validação de entrada

---

### Documentação da API

- Swagger UI: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- Todos os endpoints, modelos e fluxos de autenticação estão documentados lá.

---

### Licença

Este projeto é privado e não possui uma licença aberta.

---

Para quaisquer dúvidas, consulte os comentários do código, siga a estrutura de pastas e use os scripts e convenções fornecidos. Se você precisar estender o sistema, siga os padrões existentes para módulos, serviços, controllers e DTOs.

---

## Gerando entidades automaticamente

Este projeto possui um gerador de entidades no NestJS.
O comando cria **controller, service, repository, interface, entity, module e DTOs** de forma padronizada.

### Como usar

```bash
pnpm make:entity <EntityName>
```

Exemplo:

```bash
pnpm make:entity Product
```

### Estrutura gerada

Ao rodar o comando acima, será criada a seguinte estrutura dentro de `src/product/`:

```
src/product/
  ├── dto/
  │   ├── create-product-dto.ts
  │   └── update-product-dto.ts
  ├── product.controller.ts
  ├── product.service.ts
  ├── product.service.spec.ts
  ├── product.repository.ts
  ├── product.interface.ts
  ├── product.entity.ts
  └── product.module.ts
```
