# Dock Despachante — API

API backend da plataforma **Dock Despachante**, sistema para gestão de serviços de documentação veicular no Brasil.

## Sumário

- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Módulos](#módulos)
- [Endpoints](#endpoints)
- [Autenticação e Autorização](#autenticação-e-autorização)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Instalação e Execução](#instalação-e-execução)
- [Scripts](#scripts)
- [Gerador de Entidades](#gerador-de-entidades)
- [Testes](#testes)
- [Padrão de Commits](#padrão-de-commits)
- [Swagger](#swagger)

---

## Stack

| Tecnologia           | Uso                                       |
|----------------------|-------------------------------------------|
| NestJS 11            | Framework principal                       |
| TypeScript 5         | Linguagem                                 |
| TypeORM 0.3          | ORM                                       |
| PostgreSQL           | Banco de dados (`dockDespachante`)        |
| JWT + Passport       | Autenticação stateless                    |
| CASL                 | Autorização baseada em roles/políticas    |
| Nodemailer           | Envio de e-mails via SMTP (Titan Mail)    |
| Handlebars           | Templates de e-mail (`/templates`)        |
| fast-xml-parser      | Parsing de XML (débitos veiculares)       |
| Swagger / OpenAPI    | Documentação interativa da API            |
| pnpm                 | Gerenciador de pacotes                    |
| Biome + ESLint       | Lint e formatação                         |
| Jest                 | Testes unitários                          |

---

## Arquitetura

O projeto segue a estrutura modular do NestJS. Cada domínio é um módulo independente com controller, service, repository, entity e DTOs próprios.

```
src/
  auth/               # Login e recuperação de senha
  users/              # CRUD de usuários
  vehicle-debts/      # Consulta de débitos veiculares com juros e opções de pagamento
  code-validations/   # Códigos de validação por e-mail
  casl/               # Políticas de permissão (RBAC)
  jwt/                # Guards, estratégia e decorators JWT
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

| Role    | Permissões  |
|---------|-------------|
| `ADMIN` | Acesso total (`LIST`, `READ`, `CREATE`, `UPDATE`, `DELETE`) |

---

## Módulos

### AuthModule

Responsável por todo o fluxo de autenticação:

- Login com e-mail/senha
- Recuperação de senha via código por e-mail
- Validação de código de primeiro acesso

### UserModule

CRUD completo de usuários com:

- Paginação na listagem
- Checagem de disponibilidade de e-mail
- Soft delete com rastreabilidade

### VehicleDebtsModule

Consulta e simulação de pagamento de débitos veiculares por placa. Integra com múltiplos provedores externos (JSON e XML), normaliza os dados, aplica juros e gera opções de pagamento.

#### Arquitetura interna

```
vehicle-debts/
  domain/
    interest.calculator.ts     # Regras de juros e enriquecimento dos débitos
    payment.calculator.ts      # Cálculo de PIX e parcelas (Price/PMT)
  providers/
    provider-chain.service.ts  # Chain of Responsibility + retry + circuit breaker
    mock-provider-a.service.ts # Adapter para resposta JSON
    mock-provider-b.service.ts # Adapter para resposta XML (fast-xml-parser)
  interfaces/
    vehicle-debts-provider.interface.ts  # Porta IVehicleDebtsProvider
  mocks/
    provider-a.mock.json
    provider-b.mock.xml
  dto/
    vehicle-debts-response.dto.ts
  vehicle-debts.controller.ts  # Validação de placa + roteamento
  vehicle-debts.service.ts     # Orquestração do fluxo
  vehicle-debts.module.ts
```

#### Padrões utilizados

| Padrão | Onde |
|--------|------|
| **Ports & Adapters** | `IVehicleDebtsProvider` é a porta; cada provider é um adaptador |
| **Strategy** | Providers são estratégias intercambiáveis de integração |
| **Adapter** | `MockProviderAService` (JSON→canônico) e `MockProviderBService` (XML→canônico) |
| **Chain of Responsibility** | `ProviderChainService` itera providers em ordem com fallback |
| **Circuit Breaker** | Estado por provider em memória; abre após N falhas, fecha após cooldown |

#### Regras de negócio

**Juros simples com arredondamento HALF_UP:**

| Tipo | Taxa diária | Teto | Fórmula |
|------|-------------|------|---------|
| `IPVA` | `IPVA_DAILY_RATE` (0,33%) | `IPVA_MAX_RATE` (20% do valor original) | `min(valor × taxa × dias, valor × teto)` |
| `MULTA` | `MULTA_DAILY_RATE` (1%) | Sem teto | `valor × taxa × dias` |

- Débitos não vencidos (`dias_atraso ≤ 0`): juros = 0, `valor_atualizado = valor_original`
- Tipo desconhecido: HTTP 422 `{ "error": "unknown_debt_type", "type": "<TIPO>" }`

**Opções de pagamento geradas:**

- `TOTAL` — soma de todos os débitos atualizados
- `SOMENTE_<TIPO>` — subtotal por tipo (ex.: `SOMENTE_IPVA`, `SOMENTE_MULTA`)

**PIX:** desconto de 5% sobre o `valor_base` de cada opção.

**Cartão de crédito:** parcelas fixas em 1x (sem juros), 6x e 12x com amortização Price (PMT) a 2,5% a.m.

#### Resiliência

- **Fallback:** se um provider lança exceção, o chain tenta o próximo na ordem configurada
- **Retry com exponential backoff:** cada provider é tentado `1 + PROVIDER_RETRY_ATTEMPTS` vezes; o delay entre tentativas dobra a cada falha (`PROVIDER_RETRY_DELAY_MS × 2ⁿ`)
- **Circuit breaker:** após `CIRCUIT_BREAKER_THRESHOLD` falhas consecutivas o provider é ignorado pelo período de `CIRCUIT_BREAKER_COOLDOWN_MS`; ao expirar volta a HALF-OPEN e testa uma chamada

#### Erros estruturados

| HTTP | Payload | Condição |
|------|---------|----------|
| 400 | `{ "error": "invalid_plate" }` | Placa fora do padrão antigo ou Mercosul |
| 404 | `{ "error": "plate_not_found", "plate": "..." }` | Nenhum provider reconheceu a placa |
| 422 | `{ "error": "unknown_debt_type", "type": "..." }` | Tipo de débito sem regra de juros |
| 503 | `{ "error": "all_providers_unavailable" }` | Todos os providers falharam |

#### Logs e LGPD

Todos os logs mascaram a placa antes de exibir: `AB***34` — nenhum dado identificável é exposto nos logs estruturados.

#### Como adicionar um novo provider

O sistema usa injeção por token (`VEHICLE_DEBTS_PROVIDERS`) e a **ordem do array define a prioridade** na chain. Para integrar um novo provedor externo:

**1. Criar o serviço**

Crie `src/vehicle-debts/providers/meu-provider.service.ts` implementando `IVehicleDebtsProvider`:

```ts
import { Injectable } from '@nestjs/common';
import { IVehicleDebtsProvider, ProviderResult } from '../interfaces/vehicle-debts-provider.interface';

@Injectable()
export class MeuProviderService implements IVehicleDebtsProvider {
  async getDebts(plate: string): Promise<ProviderResult | null> {
    // Chama a API externa, parseia e normaliza a resposta.
    // Retorne null se a placa não for encontrada neste provider.
    return {
      plate,
      provider: 'C',   // identificador único deste provider
      debts: [
        { type: 'IPVA', amount: 1000, due_date: '2024-01-10' },
      ],
    };
  }
}
```

> O tipo `provider` na interface (`'A' | 'B'`) deve ser expandido com o novo identificador em `vehicle-debts-provider.interface.ts`.

**2. Registrar no módulo**

Em `vehicle-debts.module.ts`, adicione o serviço e inclua-o na factory do token:

```ts
import { MeuProviderService } from './providers/meu-provider.service';

@Module({
  providers: [
    VehicleDebtsService,
    ProviderChainService,
    MockProviderAService,
    MockProviderBService,
    MeuProviderService,           // registrar como provider NestJS
    {
      provide: VEHICLE_DEBTS_PROVIDERS,
      useFactory: (a: MockProviderAService, b: MockProviderBService, c: MeuProviderService) => [a, b, c],
      inject: [MockProviderAService, MockProviderBService, MeuProviderService],
    },
  ],
})
export class VehicleDebtsModule {}
```

O `ProviderChainService` itera o array na ordem dada, com retry e circuit breaker automáticos para cada elemento — nenhuma outra alteração é necessária.

### CodeValidationModule

Gerencia códigos temporários enviados por e-mail para:
- Primeiro acesso do usuário
- Recuperação de senha

---

## Endpoints

### Auth

| Método | Rota                           | Auth    | Descrição                                    |
|--------|--------------------------------|---------|----------------------------------------------|
| POST   | `/login`                       | Público | Login com e-mail e senha                     |
| POST   | `/send-code-recovery-password` | Público | Envia código de recuperação por e-mail       |
| POST   | `/validate-code`               | Público | Valida código de primeiro acesso/recuperação |
| PATCH  | `/recover-password`            | Público | Redefine a senha com o código validado       |

### Users

| Método | Rota                  | Auth   | Permissão            | Descrição                          |
|--------|-----------------------|--------|----------------------|------------------------------------|
| POST   | `/users`              | Bearer | `CREATE User`        | Cria novo usuário                  |
| GET    | `/users`              | Bearer | qualquer autenticado | Lista usuários com paginação       |
| GET    | `/users/:id`          | Bearer | qualquer autenticado | Busca usuário por ID               |
| PUT    | `/users/:id`          | Bearer | `UPDATE User`        | Atualiza usuário                   |
| DELETE | `/users/:id`          | Bearer | `DELETE User`        | Remove usuário (soft delete)       |
| GET    | `/users/check/:email` | Bearer | qualquer autenticado | Verifica disponibilidade de e-mail |

### Vehicle Debts

| Método | Rota                    | Auth   | Descrição                                              |
|--------|-------------------------|--------|--------------------------------------------------------|
| GET    | `/vehicle-debts/:plate` | Bearer | Consulta débitos, juros e opções de pagamento da placa |

**Exemplo de resposta** (placa `ABC1234`, data de referência `2024-05-10`):

```json
{
  "placa": "ABC1234",
  "provedor": "A",
  "debitos": [
    {
      "tipo": "IPVA",
      "valor_original": "1500.00",
      "valor_atualizado": "1800.00",
      "vencimento": "2024-01-10",
      "dias_atraso": 121
    },
    {
      "tipo": "MULTA",
      "valor_original": "300.50",
      "valor_atualizado": "555.93",
      "vencimento": "2024-02-15",
      "dias_atraso": 85
    }
  ],
  "resumo": {
    "total_original": "1800.50",
    "total_atualizado": "2355.93"
  },
  "pagamentos": {
    "opcoes": [
      {
        "tipo": "TOTAL",
        "valor_base": "2355.93",
        "pix": { "total_com_desconto": "2238.13" },
        "cartao_credito": {
          "parcelas": [
            { "quantidade": 1,  "valor_parcela": "2355.93" },
            { "quantidade": 6,  "valor_parcela": "427.72"  },
            { "quantidade": 12, "valor_parcela": "229.67"  }
          ]
        }
      },
      {
        "tipo": "SOMENTE_IPVA",
        "valor_base": "1800.00",
        "pix": { "total_com_desconto": "1710.00" },
        "cartao_credito": {
          "parcelas": [
            { "quantidade": 1,  "valor_parcela": "1800.00" },
            { "quantidade": 6,  "valor_parcela": "326.79"  },
            { "quantidade": 12, "valor_parcela": "175.48"  }
          ]
        }
      },
      {
        "tipo": "SOMENTE_MULTA",
        "valor_base": "555.93",
        "pix": { "total_com_desconto": "528.13" },
        "cartao_credito": {
          "parcelas": [
            { "quantidade": 1,  "valor_parcela": "555.93" },
            { "quantidade": 6,  "valor_parcela": "100.93" },
            { "quantidade": 12, "valor_parcela": "54.20"  }
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

Ações disponíveis: `CREATE`, `READ`, `LIST`, `UPDATE`, `DELETE`, `MANAGE`.

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

# Débitos Veiculares — data de referência
REFERENCE_DATE=2024-05-10T00:00:00Z  # Data fixa para cálculo de juros (omitir para usar data atual)

# Débitos Veiculares — taxas de juros
IPVA_DAILY_RATE=0.0033             # Taxa diária IPVA (padrão: 0,33%)
IPVA_MAX_RATE=0.20                 # Teto de juros IPVA (padrão: 20% do valor original)
MULTA_DAILY_RATE=0.01              # Taxa diária MULTA (padrão: 1%)

# Débitos Veiculares — resiliência de providers
PROVIDER_RETRY_ATTEMPTS=2          # Tentativas extras por provider antes de fallback (padrão: 2)
PROVIDER_RETRY_DELAY_MS=200        # Delay base do backoff exponencial em ms (padrão: 200)
CIRCUIT_BREAKER_THRESHOLD=3        # Falhas consecutivas para abrir o circuito (padrão: 3)
CIRCUIT_BREAKER_COOLDOWN_MS=30000  # Tempo de cooldown do circuito em ms (padrão: 30000)

# Débitos Veiculares — simulação de falha (desenvolvimento/testes)
SIMULATE_PROVIDER_A_FAILURE=false  # true → Provider A sempre lança exceção
SIMULATE_PROVIDER_B_FAILURE=false  # true → Provider B sempre lança exceção
```

---

## Instalação e Execução

### Via Docker Compose (recomendado)

**Pré-requisitos:** Docker e Docker Compose instalados.

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd api

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env — atenção ao POSTGRES_HOST que deve ser o nome do serviço:
# POSTGRES_HOST=db_dock
```

> **Importante:** ao rodar com Docker Compose o `POSTGRES_HOST` deve ser `db_dock` (nome do serviço), não `localhost`.

```bash
# 3. Subir tudo (banco + seeders + API)
docker compose up --build
```

O Docker irá:
1. Executar os testes unitários durante o build — se algum falhar, o processo para.
2. Aguardar o banco estar saudável (`healthcheck`) antes de subir a API.
3. Rodar os seeders (cria usuário admin inicial).
4. Iniciar a API.

| Recurso | URL |
|---------|-----|
| API | `http://localhost:3333` |
| Swagger | `http://localhost:3333/api/docs` |

**Credenciais do Swagger:** usuário `admin` · senha `DockDespachante!@Swagger2026`

```bash
# Parar os containers
docker compose down

# Parar e remover o volume do banco (reset completo)
docker compose down -v
```

---

### Local (sem Docker)

**Pré-requisitos:** Node.js 20+, pnpm 9+, PostgreSQL 15+.

```bash
# 1. Clonar o repositório
git clone <repo-url>
cd api

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais (POSTGRES_HOST=localhost)

# 4. Rodar os seeders (cria usuário admin inicial)
pnpm seed

# 5. Iniciar em modo desenvolvimento
pnpm start:dev
```

A API estará disponível em `http://localhost:3333`.

---

## Scripts

| Comando            | Descrição                                   |
|--------------------|---------------------------------------------|
| `pnpm start:dev`   | Inicia com hot-reload                       |
| `pnpm start:prod`  | Inicia a versão compilada (`dist/main`)     |
| `pnpm build`       | Compila o projeto TypeScript                |
| `pnpm test`        | Executa todos os testes unitários           |
| `pnpm test:cov`    | Executa testes com relatório de cobertura   |
| `pnpm test:watch`  | Testes em modo watch                        |
| `pnpm test:e2e`    | Testes end-to-end                           |
| `pnpm format`      | Formata o código com Biome                  |
| `pnpm lint`        | Lint do código com Biome                    |
| `pnpm seed`        | Executa os seeders do banco de dados        |
| `pnpm make:entity` | Gera scaffold de uma nova entidade          |

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

Os testes usam **Jest** com **SWC** como transpilador. A suite atual conta com **21 suites** e **141 testes**, todos passando.

```bash
# Rodar todos os testes
pnpm test

# Com cobertura
pnpm test:cov

# Arquivo específico
pnpm test -- vehicle-debts
```

Factories de teste ficam em `src/testing/factories/` (ex: `make-user.ts` usando `@faker-js/faker`).

### Cobertura por módulo

#### Domínio — Vehicle Debts

| Suite | O que cobre |
|-------|-------------|
| `interest.calculator.spec.ts` | `roundHalfUp`, IPVA (cap e sem cap), MULTA, não vencido, vence hoje, tipo desconhecido, lista vazia |
| `payment.calculator.spec.ts` | Lista vazia, golden path TOTAL/IPVA/MULTA, tipo único, mesmo tipo duplicado, estrutura de parcelas [1x/6x/12x] |
| `vehicle-debts.service.spec.ts` | Golden path completo (valores do spec), placa não encontrada, zero débitos, tipo desconhecido (422) |
| `vehicle-debts.service.spec.ts` (fallback) | Fallback para segundo provider, 503 quando todos falham, null sem tentar próximo |
| `vehicle-debts.service.spec.ts` (retry) | 3 chamadas ao provider em falha (1 + 2 retries), sucesso na segunda tentativa |
| `vehicle-debts.service.spec.ts` (circuit breaker) | Circuito abre após threshold e pula provider; reset após cooldown (HALF-OPEN) |

#### Providers

| Suite | O que cobre |
|-------|-------------|
| `mock-provider-a.service.spec.ts` | Parse JSON, case-insensitive, placa desconhecida, sem débitos, falha simulada via env |
| `mock-provider-b.service.spec.ts` | Parse XML, case-insensitive, placa desconhecida, sem débitos, falha simulada via env |

#### Controllers

| Suite | O que cobre |
|-------|-------------|
| `vehicle-debts.controller.spec.ts` | Placa válida (formato antigo e Mercosul), placa inválida (3 variações + sem chamar service), propagação de 404/503 |
| `auth.controller.spec.ts` | `POST /login` (ok/404/403), `POST /send-code-recovery-password` (ok/404), `POST /validate-code` (ok/403), `PATCH /recover-password` (ok/404) |
| `user.controller.spec.ts` | CRUD completo de usuários |

#### Guards e Estratégia JWT

| Suite | O que cobre |
|-------|-------------|
| `jwt.guard.spec.ts` | Rota pública → passa sem token; rota privada → delega ao `AuthGuard('jwt')` |
| `super-admin.guard.spec.ts` | Sem decorator → passa; ADMIN → passa; USER → 403; sem usuário → 403; null → 403 |
| `jwt.strategy.spec.ts` | Payload válido; userId não-UUID → erro; role inválida → erro; userId ausente → erro |

#### Autorização CASL

| Suite | O que cobre |
|-------|-------------|
| `casl-ability.factory.spec.ts` | ADMIN pode LIST/READ/CREATE/UPDATE/DELETE em `"all"` |
| `policies.guard.spec.ts` | Sem handlers → true; handler função true/false; handler objeto; AND lógico (todos devem passar) |

#### Serviços de domínio

| Suite | O que cobre |
|-------|-------------|
| `auth.service.spec.ts` | Login, recuperação de senha, validação de código |
| `user.service.spec.ts` | CRUD de usuários, checagem de e-mail |
| `code-validation.service.spec.ts` | Criação, validação e expiração de códigos |

#### Infraestrutura e utilitários

| Suite | O que cobre |
|-------|-------------|
| `response-interceptor.spec.ts` | Envolve resposta em `{ success, data, errors }`, mensagem GET vs POST, null/undefined → null, timestamp ISO 8601 |
| `util.spec.ts` | Código sempre string de 6 dígitos, apenas numérico, intervalo [100000–999999], distribuição aleatória |
| `jwt.utils.spec.ts` | Token válido → `userId`; sem header; sem `Bearer`; assinatura errada; token expirado; `userId` ausente |
| `user.seed.spec.ts` | Seeder cria usuário admin inicial |

---

## Padrão de Commits

O projeto usa [Conventional Commits](https://www.conventionalcommits.org/):

| Prefixo     | Quando usar                               |
|-------------|-------------------------------------------|
| `feat:`     | Nova funcionalidade                       |
| `fix:`      | Correção de bug                           |
| `refactor:` | Refatoração sem mudança de comportamento  |
| `test:`     | Adição ou correção de testes              |
| `chore:`    | Tarefas de manutenção, config             |
| `docs:`     | Documentação                              |
| `perf:`     | Melhoria de performance                   |

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
