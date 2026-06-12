# Suporte Técnico, Instalação e Requisitos

Last update: 09.06.2026

Este documento resume o necessário para instalar, executar e dar suporte técnico à aplicação Argent. O objetivo é servir como checklist operacional para desenvolvimento local, produção pequena e diagnóstico inicial de incidentes.

<br>

## Visão geral

Argent é uma aplicação web de finanças pessoais baseada em `Next.js`, `React`, `TypeScript`, `PostgreSQL` e `Prisma`. A aplicação permite autenticação de utilizadores, gestão de contas, transações, orçamentos, objetivos financeiros, notificações, folhas de cálculo internas, painel de administração e integração bancária através da Salt Edge.

<br>

## Requisitos mínimos

| Requisito | Mínimo | Recomendado | Observações |
| :-- | :-- | :-- | :-- |
| Sistema operativo | macOS, Linux ou Windows | Linux em produção | Qualquer ambiente suportado por Node.js e PostgreSQL. |
| Node.js | `20.0.0` | Última versão LTS compatível com Node 20+ | Definido em `package.json` através de `engines.node`. |
| pnpm | `10.x` | `10.24.0` | O projeto declara `packageManager: pnpm@10.24.0` e inclui `pnpm-lock.yaml`. |
| PostgreSQL | `14+` | `16+` | Base de dados principal da aplicação. |
| Git | `2.x` | Versão estável recente | Necessário para clonar e atualizar o repositório. |
| CPU | 2 vCPU | 2-4 vCPU | Builds e hashing de passwords usam CPU. |
| RAM | 2 GB | 4-8 GB | O hashing `scrypt` usa memória; builds de Next.js beneficiam de mais RAM. |
| Disco | 2 GB livres | 5 GB+ | Inclui dependências, cache, build e logs. |
| Browser | Chrome, Edge, Firefox ou Safari recentes | Versão estável atual | Necessário para utilizar a interface web. |

<br>

## Dependências principais

As dependências são instaladas a partir de `package.json`.

**Runtime da aplicação**

- `next` `16.2.6`
- `react` `19.2.0`
- `react-dom` `19.2.0`
- `@prisma/client` `7.8.0`
- `@prisma/adapter-pg` `7.8.0`
- `@tanstack/react-query`
- `@tanstack/react-table`
- `tailwindcss` `4`
- `@radix-ui/*`
- `lucide-react`
- `resend`
- `zod`
- `@huggingface/transformers`

**Ferramentas de desenvolvimento**

- `typescript`
- `eslint`
- `eslint-config-next`
- `prisma`
- `tsx`
- `dotenv`

**Serviços externos**

| Serviço | Obrigatório | Uso |
| :-- | :-- | :-- |
| PostgreSQL | Sim | Persistência de utilizadores, contas, transações e dados da aplicação. |
| Resend | Sim para emails | Recuperação de password e emails transacionais. A app pode arrancar sem ele, mas fluxos de email falham. |
| Salt Edge | Apenas para conexão bancária | Open Banking, importação de contas e sincronização de transações. |
| Google OAuth | Opcional | Login com Google. |
| GitHub OAuth | Opcional | Login com GitHub. |
| Vercel, VPS ou outro host | Produção | Execução pública da aplicação. |

<br>

## Variáveis de ambiente

Crie um ficheiro `.env` na raiz do projeto para desenvolvimento local. Em produção, configure as mesmas variáveis no gestor de segredos do serviço de hosting.

### Mínimo para a aplicação funcionar em produção

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/argent"
SESSION_SECRET="generate-a-random-64-character-hex-string"
PASSWORD_PEPPER_ACTIVE="p1"
PASSWORD_PEPPER_P1="generate-a-random-64-character-hex-string"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Variáveis por categoria

| Variável | Obrigatória | Descrição |
| :-- | :-- | :-- |
| `DATABASE_URL` | Sim | String de ligação ao PostgreSQL. |
| `SESSION_SECRET` | Sim em produção | Segredo HMAC para assinar sessões. Também são aceites `AUTH_SECRET` ou `NEXTAUTH_SECRET`, mas `SESSION_SECRET` é o nome preferido. |
| `PASSWORD_PEPPER_ACTIVE` | Recomendado | Versão ativa do pepper de passwords. O padrão interno é `p1`. |
| `PASSWORD_PEPPER_P1` | Sim em produção | Pepper usado no hashing de passwords quando a versão ativa é `p1`. Deve ter pelo menos 32 caracteres. |
| `PASSWORD_PEPPER_P2` | Apenas em rotação | Pepper adicional para rotação segura de passwords. |
| `NEXT_PUBLIC_APP_URL` | Recomendado | URL pública da aplicação, usada em callbacks, redirects e links de email. |
| `APP_URL` | Opcional | Fallback server-side quando `NEXT_PUBLIC_APP_URL` não está definido. |
| `RESEND_API_KEY` | Sim para emails | Chave da API Resend. Sem isto, recuperação de password e envio de emails falham. |
| `RESEND_FROM_EMAIL` | Opcional | Email remetente. Padrão: `Argent <onboarding@resend.dev>`. |
| `RESEND_DEV_TO_EMAIL` | Opcional | Redireciona emails em desenvolvimento para uma caixa segura de teste. |
| `SALT_EDGE_APP_ID` | Sim para banco | ID da aplicação Salt Edge. |
| `SALT_EDGE_SECRET` | Sim para banco | Segredo da API Salt Edge. |
| `SALT_EDGE_BASE_URL` | Opcional | URL base da Salt Edge. Padrão: `https://www.saltedge.com/api/v6`. |
| `GOOGLE_CLIENT_ID` | Opcional | Client ID para login Google. |
| `GOOGLE_CLIENT_SECRET` | Opcional | Client Secret para login Google. |
| `GITHUB_CLIENT_ID` | Opcional | Client ID para login GitHub. |
| `GITHUB_CLIENT_SECRET` | Opcional | Client Secret para login GitHub. |
| `TRUSTED_CLIENT_IP_HEADER` | Opcional | Header usado para identificar IP real atrás de proxy confiável. |
| `PRISMA_LOG_QUERIES` | Opcional | Use `1` para ativar logs detalhados de queries Prisma em desenvolvimento. |

### Gerar segredos

```bash
openssl rand -hex 32
```

Execute o comando uma vez para `SESSION_SECRET` e outra vez para cada `PASSWORD_PEPPER_P<N>`.

<br>

## Instalação local

### 1. Clonar o repositório

```bash
git clone https://github.com/HilFerr/Argent.git
cd Argent
```

### 2. Ativar pnpm

```bash
corepack enable
corepack prepare pnpm@10.24.0 --activate
pnpm -v
```

Se o `corepack` não estiver disponível, instale o `pnpm` globalmente:

```bash
npm install -g pnpm@10.24.0
```

### 3. Instalar dependências

```bash
pnpm install
```

### 4. Criar a base de dados

Exemplo local com PostgreSQL:

```sql
CREATE DATABASE argent;
```

Configure `DATABASE_URL` no `.env` apontando para essa base de dados.

### 5. Aplicar migrations e gerar Prisma Client

```bash
pnpm prisma migrate deploy --schema prisma/schema.prisma
pnpm prisma generate --schema prisma/schema.prisma
```

Para desenvolvimento com alterações de schema, use `pnpm prisma migrate dev` quando for necessário criar uma nova migration.

### 6. Arrancar a aplicação

```bash
pnpm dev
```

A aplicação fica disponível em `http://localhost:3000`.

<br>

## Build e execução em produção

### Preparar build

```bash
pnpm install --frozen-lockfile
pnpm prisma migrate deploy --schema prisma/schema.prisma
pnpm build
```

O script `pnpm build` já executa `prisma generate` antes do build de Next.js.

### Iniciar servidor

```bash
pnpm start
```

Por padrão, o Next.js serve a aplicação na porta `3000`. Em produção, coloque a aplicação atrás de HTTPS com Vercel, Nginx, Caddy, um load balancer ou outro reverse proxy.

### Checklist de produção

- `DATABASE_URL` aponta para uma base de dados PostgreSQL persistente.
- `SESSION_SECRET` está definido e é estável entre deploys.
- `PASSWORD_PEPPER_P1` está definido com pelo menos 32 caracteres.
- `NEXT_PUBLIC_APP_URL` usa o domínio público correto.
- As migrations foram aplicadas antes de servir tráfego.
- HTTPS está ativo.
- Backups da base de dados estão configurados.
- Logs de aplicação e métricas básicas estão acessíveis.

<br>

## Comandos de verificação

Execute estes comandos antes de publicar alterações:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```

Comandos úteis de Prisma:

```bash
pnpm prisma migrate status --schema prisma/schema.prisma
pnpm prisma generate --schema prisma/schema.prisma
```

Scripts operacionais disponíveis:

```bash
pnpm run admin:users
pnpm run admin:promote
pnpm run admin:reset
pnpm run password:rehash-user -- <email> <newPassword>
```

<br>

## Suporte técnico

### Informação a recolher antes de diagnosticar

- Ambiente: local, staging ou produção.
- Sistema operativo e versão.
- Versões de `node`, `pnpm` e `postgres`.
- Comando executado e erro completo.
- Commit ou branch em execução.
- Estado das migrations: `pnpm prisma migrate status --schema prisma/schema.prisma`.
- Presença das variáveis de ambiente necessárias, sem expor valores secretos.
- Logs do servidor Next.js, Prisma, reverse proxy e base de dados.

### Problemas comuns

| Sintoma | Causa provável | Ação recomendada |
| :-- | :-- | :-- |
| `pnpm install` falha | Versão de Node/pnpm incompatível | Confirmar `node -v`, ativar `pnpm@10.24.0` e repetir instalação. |
| App não liga à base de dados | `DATABASE_URL` incorreto ou PostgreSQL indisponível | Testar conexão, confirmar host, porta, user, password e nome da DB. |
| Erro de Prisma Client | Cliente não gerado ou migrations não aplicadas | Executar `pnpm prisma generate --schema prisma/schema.prisma` e verificar migrations. |
| Sessões expiram a cada restart | `SESSION_SECRET` ausente em desenvolvimento | Definir `SESSION_SECRET` fixo no `.env`. |
| Erro de pepper em produção | `PASSWORD_PEPPER_P1` ausente ou curto | Definir `PASSWORD_PEPPER_P1` com pelo menos 32 caracteres. |
| Login OAuth retorna erro de configuração | Client ID/secret ausentes | Configurar provider e callback URL correto. |
| Recuperação de password falha | Resend não configurado | Confirmar `RESEND_API_KEY`, remetente e domínio verificado. |
| Emails chegam à conta errada em dev | `RESEND_DEV_TO_EMAIL` ativo | Confirmar se o override é intencional. |
| Conexão bancária falha | Salt Edge ausente, credenciais erradas ou redirect inválido | Confirmar `SALT_EDGE_APP_ID`, `SALT_EDGE_SECRET` e `NEXT_PUBLIC_APP_URL`. |
| Redirect ou cookie problemático em produção | URL pública ou HTTPS incorretos | Confirmar `NEXT_PUBLIC_APP_URL`, domínio, proxy e HTTPS. |
| Build falha por memória | Host pequeno para build Next.js | Aumentar RAM/CPU ou fazer build em ambiente maior. |

<br>

## Atualização e manutenção

Fluxo recomendado para atualizar uma instância já existente:

```bash
git pull
pnpm install --frozen-lockfile
pnpm prisma migrate deploy --schema prisma/schema.prisma
pnpm build
pnpm start
```

Se usar PM2 ou outro process manager, reinicie o processo depois do build:

```bash
pm2 restart argent
```

<br>

## Segurança operacional

- Nunca commitar `.env`, chaves privadas, tokens ou passwords.
- Não publicar valores reais de `SESSION_SECRET`, `PASSWORD_PEPPER_*`, `RESEND_API_KEY` ou `SALT_EDGE_SECRET` em logs ou tickets.
- Rodar `SESSION_SECRET` termina as sessões ativas de todos os utilizadores.
- Rodar peppers exige manter o pepper antigo configurado até todos os hashes antigos serem reescritos ou resetados.
- Fazer backup da base de dados antes de migrations em produção.
- Usar HTTPS em todos os ambientes públicos.
- Restringir acesso direto ao PostgreSQL.
- Monitorizar logs de autenticação, falhas de email, erros de Salt Edge e latência de base de dados.

<br>

## Critérios mínimos para considerar a instalação funcional

- A aplicação responde em `GET /login` ou na rota principal.
- É possível registar ou autenticar um utilizador.
- A sessão permanece válida após refresh da página.
- A base de dados recebe e lê dados através das rotas da aplicação.
- `pnpm run typecheck` passa.
- `pnpm run lint` passa.
- `pnpm run build` termina com sucesso.
- Funcionalidades opcionais mostram erro controlado quando `Resend`, `Salt Edge` ou OAuth não estão configurados.
