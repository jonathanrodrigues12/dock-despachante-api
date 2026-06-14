# Dock Despachante — API

API backend da plataforma **Dock Despachante**, sistema SaaS para gestão de serviços de documentação veicular no Brasil.

## Sumário

- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Módulos](#módulos)
- [Endpoints](#endpoints)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Execução](#instalação-e-execução)
- [Scripts](#scripts)
- [Storage e Processamento de Imagens](#storage-e-processamento-de-imagens)
- [Gerador de Entidades](#gerador-de-entidades)
- [Testes](#testes)
- [Padrão de Commits](#padrão-de-commits)
- [Swagger](#swagger)

---

## Stack

| Tecnologia         | Uso                                       |
|--------------------|-------------------------------------------|
| NestJS 11          | Framework principal                       |
| TypeScript 5       | Linguagem                                 |
| TypeORM 0.3        | ORM                                       |
| PostgreSQL         | Banco de dados (`dockDespachante`)        |
| JWT + Passport     | Autenticação stateless                    |
| Google OAuth2 (OIDC) | Login social                            |
| speakeasy / qrcode | MFA via TOTP                              |
| CASL               | Autorização baseada em roles/políticas    |
| Nodemailer         | Envio de e-mails via SMTP (Titan Mail)    |
| Handlebars         | Templates de e-mail (`/templates`)        |
| sharp              | Processamento e compressão de imagens     |
| AWS S3 / GCP       | Storage em nuvem (selecionável via env)   |
| fast-xml-parser    | Parsing de XML (débitos veiculares)       |
| Swagger / OpenAPI  | Documentação interativa da API            |
| pnpm               | Gerenciador de pacotes                    |
| Biome + ESLint     | Lint e formatação                         |
| Jest               | Testes unitários                          |

---

## Arquitetura

O projeto segue a estrutura modular do NestJS. Cada domínio é um módulo independente com controller, service, repository, entity e DTOs próprios.

```
src/
  auth/               # Login, recuperação de senha, Google SSO, MFA
  users/              # CRUD de usuários, upload de foto
  vehicle-debts/      # Consulta de débitos veiculares com juros e opções de pagamento
  code-validations/   # Códigos de validação por e-mail
  casl/               # Políticas de permissão (RBAC)
  jwt/                # Guards, estratégia e decorators JWT
  storage/            # Abstração de storage: local / S3 / GCP
  mailer/             # Configuração do módulo de e-mail
  database/           # Conexão TypeORM e seeders
  env/                # Validação de variáveis de ambiente
  common/             # Enums, entidades base, paginação, utilitários
```

### Entidade base

Todas as entidades de domínio estendem `EntityBase`, que provê:
- `id` (UUID v4)
- `created_at`, `updated_at`, `deleted_at` (soft delete)
- `created_by`, `updated_by`, `deleted_by` (UUID do responsável)

### Roles

| Role        | Permissões                          |
|-------------|-------------------------------------|
| `SUPERADMIN`| Acesso total                        |
| `ADMIN`     | Acesso total                        |
| `CUSTOMER`  | Somente leitura em `User`           |

---

## Módulos

### AuthModule

Responsável por todo o fluxo de autenticação:

- Login com e-mail/senha
- Recuperação de senha via código por e-mail
- Validação de código de primeiro acesso
- Login com Google via OpenID Connect
- Inicialização, verificação e confirmação de MFA (TOTP)

### UserModule

CRUD completo de usuários com:

- Upload de foto via `multipart/form-data`
- Processamento automático de imagem (compressão + redimensionamento)
- Paginação na listagem
- Checagem de disponibilidade de e-mail
- Soft delete com rastreabilidade

### VehicleDebtsModule

Consulta de débitos veiculares por placa:

- Aceita placas no formato antigo (`ABC1234`) e Mercosul (`ABC1D23`)
- Arquitetura de **provider chain**: tenta provedores em cascata, retorna 503 se todos falharem
- Calcula juros sobre os débitos
- Gera opções de pagamento: Pix (5% de desconto) e cartão de crédito (1x, 6x, 12x)
- Agrupamento de opções por tipo de débito

### CodeValidationModule

Gerencia códigos temporários enviados por e-mail para:
- Primeiro acesso do usuário
- Recuperação de senha

### StorageModule

Abstração de storage com três implementações selecionáveis via `STORAGE_TYPE`:
- `local` — salva em disco (`./uploads`)
- `s3` — AWS S3
- `gcp` — Google Cloud Storage

Inclui processamento de imagem via `sharp`:
- Redimensionamento máximo de 1920×1920px
- Conversão para JPEG com qualidade configurável
- Thumbnail 300×300px (crop centralizado)

---

## Endpoints

### Auth

| Método | Rota                       | Auth     | Descrição                                  |
|--------|----------------------------|----------|--------------------------------------------|
| POST   | `/login`                   | Público  | Login com e-mail e senha                   |
| POST   | `/send-code-recovery-password` | Público | Envia código de recuperação por e-mail |
| POST   | `/validate-code`           | Público  | Valida código de primeiro acesso/recuperação |
| PATCH  | `/recover-password`        | Público  | Redefine a senha com o código validado     |
| GET    | `/google`                  | Público  | Inicia fluxo de login com Google           |
| GET    | `/auth/google/callback`    | Público  | Callback OAuth do Google                   |
| POST   | `/mfa/initialize`          | Bearer   | Inicializa MFA (retorna secret + QR code)  |
| POST   | `/mfa/verifyInitialize`    | Bearer   | Confirma o código TOTP e ativa o MFA       |
| POST   | `/mfa/confirm`             | Público  | Confirma o MFA e retorna o accessToken     |

### Users

| Método | Rota                  | Auth   | Permissão           | Descrição                         |
|--------|-----------------------|--------|---------------------|-----------------------------------|
| POST   | `/users`              | Bearer | `CREATE User`       | Cria novo usuário (com foto)      |
| GET    | `/users`              | Bearer | qualquer autenticado | Lista usuários com paginação     |
| GET    | `/users/:id`          | Bearer | qualquer autenticado | Busca usuário por ID             |
| PUT    | `/users/:id`          | Bearer | `UPDATE User`       | Atualiza usuário (com foto)       |
| DELETE | `/users/:id`          | Bearer | `DELETE User`       | Remove usuário (soft delete)      |
| GET    | `/users/check/:email` | Bearer | qualquer autenticado | Verifica disponibilidade de e-mail |

### Vehicle Debts

| Método | Rota                      | Auth   | Descrição                                             |
|--------|---------------------------|--------|-------------------------------------------------------|
| GET    | `/vehicle-debts/:plate`   | Bearer | Consulta débitos, juros e opções de pagamento da placa |

**Exemplo de resposta:**
```json
{
  "placa": "ABC1234",
  "debitos": [
    { "tipo": "IPVA", "valor_original": "350.00", "valor_atualizado": "378.00" }
  ],
  "opcoes_pagamento": {
    "opcoes": [
      {
        "tipo": "TOTAL",
        "valor_base": "378.00",
        "pix": { "total_com_desconto": "359.10" },
        "cartao_credito": {
          "parcelas": [
            { "quantidade": 1, "valor_parcela": "378.00" },
            { "quantidade": 6, "valor_parcela": "67.63" },
            { "quantidade": 12, "valor_parcela": "35.64" }
          ]
        }
      }
    ]
  }
}
```

---

## Autenticação e Autorização

### JWT

- Todas as rotas protegidas exigem `Authorization: Bearer <token>` no header.
- Rotas públicas são marcadas com o decorator `@Public()`.
- O guard global `JwtAuthGuard` aplica a proteção automaticamente.

### CASL

Permissões são definidas em `casl-ability.factory.ts` com base no `role` do usuário e aplicadas via:
- Guard: `PoliciesGuard`
- Decorator: `@CheckPolicies((ability) => ability.can(Action.CREATE, User))`

Ações disponíveis: `CREATE`, `READ`, `UPDATE`, `DELETE`, `MANAGE`.

### MFA (TOTP)

Fluxo de MFA quando habilitado para o usuário:

1. `POST /login` → retorna `{ mfa_required: true, mfa_token: "..." }` em vez do accessToken
2. Usuário digita o código do autenticador
3. `POST /mfa/confirm` com o `mfa_token` e o `code` → retorna o accessToken final

### Google OAuth / OpenID Connect

1. Redirecionar o usuário para `GET /google`
2. Após autenticação no Google, o callback `GET /auth/google/callback` processa o token
3. Retorna o mesmo `LoginResponseDto` do login convencional

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto. Variáveis obrigatórias estão marcadas com *.

```env
# Servidor
PORT=3333                          # Padrão: 3000

# Banco de Dados
POSTGRES_HOST=localhost *
POSTGRES_PORT=5432
POSTGRES_USER=docktest *
POSTGRES_PASSWORD=sua_senha *
POSTGRES_DB=dockDespachante *
POSTGRES_SCHEMA=public             # Padrão: public
DB_SOCKET=false *

# JWT
JWT_SECRET=sua_chave_secreta *
JWT_EXPIRES_IN=3600s *

# Frontend
URL_FRONT=http://localhost *

# E-mail (SMTP)
EMAIL_HOST=smtp.titan.email *
EMAIL_PORT=465 *
EMAIL_USERNAME=no-reply@dominio.com *
EMAIL_PASSWORD=sua_senha *

# Branding (e-mails e templates)
LOGO_URL=https://dominio.com/logo.png
URL_SUPPORT=https://dominio.com/support
COMPANY_NAME=Dock Despachante

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3333/auth/google/callback

# Storage
STORAGE_TYPE=local                 # local | s3 | gcp (padrão: local)
LOCAL_STORAGE_PATH=./uploads       # Padrão: ./uploads
LOCAL_STORAGE_BASE_URL=/uploads    # Padrão: /uploads

# Processamento de Imagens
IMAGE_QUALITY=80                   # 1-100 (padrão: 80)
IMAGE_COMPRESSION_ENABLED=true     # true | false (padrão: true)

# AWS S3 (se STORAGE_TYPE=s3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1               # Padrão: us-east-1
AWS_S3_BUCKET_NAME=
AWS_S3_BASE_URL=                   # URL base customizada (ex: CloudFront)

# Google Cloud Storage (se STORAGE_TYPE=gcp)
GCP_PROJECT_ID=
GCP_BUCKET_NAME=
GCP_KEY_FILENAME=                  # Caminho para arquivo credentials.json
GCP_CREDENTIALS=                   # Ou credenciais como string JSON
```

---

## Instalação e Execução

### Pré-requisitos

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+

### Passos

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd api

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# edite o .env com suas credenciais

# 4. Subir o banco (se usar Docker)
docker run --name dock-pg -e POSTGRES_PASSWORD=sua_senha -p 5432:5432 -d postgres:15

# 5. Rodar os seeders (cria usuário admin inicial)
pnpm seed

# 6. Iniciar em modo desenvolvimento
pnpm start:dev
```

A API estará disponível em `http://localhost:3333`.

---

## Scripts

| Comando            | Descrição                                          |
|--------------------|----------------------------------------------------|
| `pnpm start:dev`   | Inicia com hot-reload                              |
| `pnpm start:prod`  | Inicia a versão compilada (`dist/main`)            |
| `pnpm build`       | Compila o projeto TypeScript                       |
| `pnpm test`        | Executa todos os testes unitários                  |
| `pnpm test:cov`    | Executa testes com relatório de cobertura          |
| `pnpm test:watch`  | Testes em modo watch                               |
| `pnpm test:e2e`    | Testes end-to-end                                  |
| `pnpm format`      | Formata o código com Biome                         |
| `pnpm lint`        | Lint do código com Biome                           |
| `pnpm seed`        | Executa os seeders do banco de dados               |
| `pnpm make:entity` | Gera scaffold de uma nova entidade                 |

---

## Storage e Processamento de Imagens

### Configuração AWS S3

```env
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=meu-bucket
# Opcional: CDN/CloudFront
AWS_S3_BASE_URL=https://cdn.meudominio.com
```

### Configuração GCP

**Opção 1 — Arquivo de credenciais:**
```env
STORAGE_TYPE=gcp
GCP_PROJECT_ID=meu-projeto
GCP_BUCKET_NAME=meu-bucket
GCP_KEY_FILENAME=./credentials.json
```

**Opção 2 — Credenciais inline (útil em containers):**
```env
GCP_CREDENTIALS={"type":"service_account","project_id":"..."}
```

**Opção 3 — Application Default Credentials:**  
Omita `GCP_KEY_FILENAME` e `GCP_CREDENTIALS`; o SDK usará as credenciais do ambiente GCP automaticamente.

### Como funciona o upload de foto

Ao criar ou atualizar um usuário com o campo `photo` (multipart/form-data):

1. A imagem é recebida via `FileInterceptor`
2. O `ImageProcessingService` processa com `sharp`:
   - Redimensiona para no máximo 1920×1920px (mantendo proporção)
   - Converte para JPEG com qualidade `IMAGE_QUALITY`
   - Gera um thumbnail 300×300px (crop centralizado)
3. O storage configurado (`local`, `s3` ou `gcp`) armazena os arquivos
4. A URL da imagem é salva em `user.photo_url`

```bash
# Exemplo de upload via curl
curl -X PUT http://localhost:3333/users/<id> \
  -H "Authorization: Bearer <token>" \
  -F "photo=@/caminho/para/foto.jpg"
```

### Estrutura do módulo

```
src/storage/
  interfaces/
    storage.interface.ts           # Contrato IStorageService
  services/
    local-storage.service.ts       # Implementação local
    s3-storage.service.ts          # Implementação AWS S3
    gcp-storage.service.ts         # Implementação GCP
    image-processing.service.ts    # Compressão e thumbnails com sharp
  storage.controller.ts
  storage.module.ts
```

---

## Gerador de Entidades

O projeto inclui um scaffold que gera todos os arquivos de um módulo de domínio de forma padronizada.

```bash
pnpm make:entity <NomeDaEntidade>
```

**Exemplo:**

```bash
pnpm make:entity Proposal
```

**Arquivos gerados em `src/proposal/`:**

```
src/proposal/
  dto/
    create-proposal.dto.ts
    update-proposal.dto.ts
  proposal.controller.ts
  proposal.service.ts
  proposal.service.spec.ts
  proposal.repository.ts
  proposal.interface.ts
  proposal.entity.ts
  proposal.module.ts
```

Após gerar, importe o módulo em `app.module.ts` e adicione a entidade ao `database.module.ts`.

---

## Testes

Os testes unitários usam **Jest** com **SWC** como transpilador (mais rápido que `ts-jest`).

```bash
# Rodar todos os testes
pnpm test

# Com cobertura
pnpm test:cov

# Arquivo específico
pnpm test -- user.service
```

Factories de teste ficam em `src/testing/factories/` (ex: `make-user.ts` usando `@faker-js/faker`).

---

## Padrão de Commits

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

| Prefixo      | Quando usar                          |
|--------------|--------------------------------------|
| `feat:`      | Nova funcionalidade                  |
| `fix:`       | Correção de bug                      |
| `refactor:`  | Refatoração sem mudança de comportamento |
| `test:`      | Adição ou correção de testes         |
| `chore:`     | Tarefas de manutenção, config        |
| `docs:`      | Documentação                         |
| `perf:`      | Melhoria de performance              |

**Exemplo:**
```
feat(vehicle-debts): add payment options with PIX discount
```

---

## Swagger

A documentação interativa da API está disponível em:

```
http://localhost:3333/api/docs
```

Para testar endpoints protegidos, clique em **Authorize** e informe o Bearer token obtido no login.

A rota `/api/docs` é protegida por autenticação básica (HTTP Basic Auth) em produção — configure as credenciais conforme necessário.
