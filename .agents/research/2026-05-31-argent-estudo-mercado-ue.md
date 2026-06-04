# Estudo de Mercado Detalhado: Argent na UE

Data de preparacao: 2026-05-31

Ambito: estudo de mercado para uma aplicacao de financas pessoais chamada Argent, com foco em lancamento na Uniao Europeia e prioridade pratica para Portugal.

Estado: estudo estrategico e produto/mercado. Nao e aconselhamento juridico, financeiro, fiscal ou regulatorio. Antes de lancamento publico, sobretudo se houver pagamentos, credito, investimento ou aconselhamento financeiro, deve haver revisao legal/regulatoria.

## 1. Resumo Executivo

Argent, pelo estado atual da documentacao local, e uma aplicacao de personal finance management (PFM): liga-se a contas bancarias via Salt Edge/Open Banking, importa contas e transacoes, categoriza movimentos com PACE, suporta bills, budgets, goals, notificacoes, exportacao e um workspace tipo spreadsheet.

O mercado existe e e real, mas e competitivo. O problema nao e "ninguém quer uma app de financas". O problema e que utilizadores ja tem uma combinacao de:

- app do banco;
- MB WAY / apps de pagamento;
- Revolut, N26, bunq ou outras neobanks;
- spreadsheets;
- apps maduras como Wallet by BudgetBakers, Spendee, Toshl, YNAB, Bankin', Emma, Snoop, Moneyhub, Actual Budget e outras.

A oportunidade para Argent nao esta em ser "mais uma app de budgeting". A oportunidade mais credível esta em ser uma ferramenta mais localizada, mais transparente e mais orientada a utilizadores europeus/portugueses que querem entender transacoes reais, MB WAY, subscricoes, gastos por categoria, bills e cash-flow sem se sentirem dentro de uma app bancaria ou de uma plataforma que tenta vender credito, investimento ou produtos financeiros.

O posicionamento recomendado:

```text
Argent e um workspace de financas pessoais para organizar transacoes ligadas a bancos, orcamentos, bills, objetivos e cash-flow.
```

O que evitar:

- posicionar como banco;
- posicionar como wallet;
- prometer pagamentos;
- prometer investimento;
- prometer aconselhamento financeiro;
- competir diretamente com MB WAY, Revolut ou bancos;
- parecer cripto, por causa do contexto Argent/Ready.

Conclusao central:

Argent pode ser defensavel como produto se entrar por um nicho estreito: "controlo financeiro pessoal para utilizadores portugueses/europeus que querem melhor categorizacao, planeamento e visibilidade do que a app do banco oferece". Para um solo founder com 15 dias, o objetivo correto nao e vencer o mercado todo. E entregar um produto coerente, confiavel, com copy segura, uma narrativa clara e um roadmap que mostre porque a app nao e apenas um dashboard bonito.

## 2. Definicao do Produto

Com base nos documentos locais:

- [docs/Technical Documentation.md](../../docs/Technical%20Documentation.md) descreve Argent como uma finance application que liga a contas bancarias, importa transacoes e oferece ferramentas praticas de gestao financeira.
- [docs/Bank Synchronization.md](../../docs/Bank%20Synchronization.md) descreve a integracao Salt Edge API v6, hosted widget, criacao de customer, connect sessions, sync de contas/transacoes e ausencia de credenciais bancarias no lado da Argent.
- [docs/PACE.md](../../docs/PACE.md) descreve o sistema de categorizacao automatica Pattern-Aware Categorization, baseado em regras do utilizador, regex e fallback por keywords.
- [docs/PACE Engine.md](../../docs/PACE%20Engine.md) descreve uma direcao futura com scoring, recorrencia, fuzzy merchant matching e confirmacao humana.
- [docs/Financial Features.md](../../docs/Financial%20Features.md) descreve bills, budgets, goals, notificacoes e exportacao de dados.

Capacidades atuais/planeadas relevantes para mercado:

- Bank sync via Salt Edge.
- Importacao de contas, balances e transacoes.
- Deduplicacao por `saltEdgeId`.
- Categorizacao PACE por regras.
- Budgets mensais por tag/categoria.
- Bills recorrentes com estado informacional.
- Goals de poupanca, emergencia, compra, viagem ou outros.
- Notificacoes in-app.
- Exportacao de dados.
- Spreadsheets/workbooks ligados a dados financeiros.
- Admin panel, audit logs e health monitoring.
- Autenticacao e escopo por utilizador.

Limites importantes:

- Argent nao executa pagamentos.
- Argent nao guarda credenciais bancarias.
- Argent nao e banco.
- Argent nao e wallet.
- Argent nao deve prometer aconselhamento financeiro.
- O campo `autoPay` em bills e informacional, nao funcionalidade de pagamento.

## 3. Categoria de Mercado

Argent encaixa primariamente em:

- Personal finance management (PFM).
- Budgeting and expense tracking.
- Account aggregation.
- Financial dashboard.
- Open Banking-powered finance software.
- Cash-flow planning / household finance workspace.

Categorias adjacentes, mas que devem ser evitadas como posicionamento principal:

- banking;
- e-wallets;
- payments;
- lending/credit;
- investing/wealth;
- crypto;
- business accounting;
- tax filing;
- financial advice.

Esta distincao e importante para produto, regulacao e marca. Apps que leem transacoes e ajudam o utilizador a organizar dinheiro vivem numa categoria menos regulada do que apps que movem dinheiro, guardam fundos, vendem credito ou executam investimentos.

## 4. Porque o Mercado Existe

### Digital banking ja e comportamento mainstream na UE

Segundo Eurostat, em 2024 93% das pessoas dos 16 aos 74 anos na UE tinham usado internet nos 3 meses anteriores, e internet banking foi uma das atividades populares, com 67% das pessoas nessa faixa etaria a usar internet banking nesse periodo. Na publicacao Digitalisation in Europe 2025, Eurostat tambem indica que 72% dos utilizadores de internet na UE usaram online banking em 2024, acima de 56% em 2014.

Interpretacao para Argent:

- O comportamento base de ver dinheiro online ja nao precisa de ser educado do zero.
- A barreira nao e "as pessoas usam apps financeiras?" A barreira e "porque usariam mais uma app alem do banco?"
- O produto precisa de justificar valor acima da app bancaria: melhor categorizacao, melhor visao multi-banco, melhor planeamento e menos ruído comercial.

### Portugal tem uso intensivo de pagamentos digitais

O Banco de Portugal reportou que, no fim de 2024, existiam 30,0 milhoes de cartoes de pagamento ativos emitidos por PSPs residentes em Portugal, media de 2,8 cartoes por habitante. Tambem reportou que os pagamentos contactless cresceram 24,0% em volume e 26,9% em valor, com 1,4 mil milhoes de operacoes, e que compras online com cartoes portugueses aumentaram 37,2% em volume e 38,3% em valor. As infraestruturas portuguesas processaram em media 11,5 milhoes de transacoes com cartao por dia.

Interpretacao para Argent:

- Um utilizador portugues tem muitos dados transacionais.
- O problema de tracking e categorizacao fica maior com mais contactless, ecommerce, subscricoes, MB WAY, transferencias e cartoes.
- Uma boa app de financas pessoais pode ganhar valor se traduzir esse volume de dados em categorias e decisoes simples.

### MB WAY molda expectativas portuguesas

A SIBS indicou em 2025 que MB WAY ultrapassou 6,5 milhoes de utilizadores e evoluiu para um ecossistema de pagamentos e servicos digitais: QR/contactless, levantamentos sem cartao, cartoes virtuais MB NET, gestao de subscricoes e pagamentos recorrentes, dividir contas, pedidos de dinheiro, doacoes e integracao nas apps bancarias participantes.

Interpretacao para Argent:

- Em Portugal, "dinheiro no telemovel" e altamente associado a MB WAY.
- Argent nao deve tentar parecer MB WAY.
- Argent deve tratar MB WAY como fonte de transacoes e contexto de categorizacao: pagamentos P2P, split bills, subscricoes, compras ecommerce e transferencias pessoais.
- PACE pode ser especialmente valioso se resolver descritores portugueses/MB WAY que apps globais classificam mal.

### Open Banking cria base tecnica, mas nao resolve UX

PSD2 abriu a porta a Account Information Services e Payment Initiation Services. O ECB descreve account information services como servicos que dao uma visao agregada da situacao financeira ao consolidar informacao de varias contas. A EBA mantem um registo central de payment/e-money institutions, incluindo account information service providers. A Comissao Europeia tambem esta a evoluir o quadro para PSD3/PSR e FiDA/Open Finance, que pretende gerir partilha de dados financeiros para alem de contas de pagamento.

Interpretacao para Argent:

- O acesso a dados bancarios e infraestrutura, nao diferenciacao por si so.
- Varias apps conseguem ligar bancos.
- O diferencial passa por experiencia, confianca, explicabilidade, localizacao, qualidade de categorizacao e integracao com workflows do utilizador.

## 5. Tamanho de Oportunidade

Nao foi feito um TAM monetario quantitativo exato porque isso exigiria dados pagos ou pesquisa primaria. Mas ha sinais fortes de oportunidade qualitativa:

- A base de utilizadores potencial inclui adultos bancarizados digitalmente na UE.
- A base portuguesa e suficientemente digital para testar uma app PFM.
- O ecossistema fintech portugues esta ativo.
- Open Banking reduz custo tecnico de ligacao inicial a bancos.
- A concorrencia prova procura, mas tambem prova saturacao.

Dados relevantes:

- Eurostat: online banking usado por grande parte da populacao/utilizadores de internet na UE.
- Banco de Portugal: crescimento forte de pagamentos eletronicos, contactless, ecommerce e transferencias instantaneas.
- SIBS: MB WAY com mais de 6,5M utilizadores.
- Portugal Fintech Report 2025 / AICEP: funding total do ecossistema fintech portugues acima de EUR 1,1B, quase um terco das fintechs fundadas nos dois anos anteriores, IA integrada em produtos por 74% das fintechs e em operacoes internas por 90%.
- Portugal Fintech Report 2025: a vertical "Finance Management" aparece como categoria propria no mapa do ecossistema, com 10,4% no snapshot reportado; "Payments & Money Transfers" aparece com 12,2%.

Leitura:

- Mercado existe.
- Mercado nao esta vazio.
- Portugal e bom para piloto por densidade de pagamentos digitais, MB WAY e proximidade cultural.
- A UE e boa para expansao se a app for desenhada com privacidade, GDPR, multi-lingua, multi-moeda e Open Banking desde o inicio.

## 6. Segmentos de Utilizador

### Segmento A: Jovem trabalhador urbano em Portugal

Perfil:

- 20-35 anos.
- Usa MB WAY, cartao, contactless, subscricoes e ecommerce.
- Pode ter conta num banco tradicional e Revolut/N26/Wise.
- Quer perceber para onde vai o dinheiro.

Problemas:

- Transacoes espalhadas.
- Categorias ruins nas apps dos bancos.
- Subscricoes esquecidas.
- MB WAY e transferencias P2P ambiguas.
- Dificuldade em ligar gastos pequenos a habitos mensais.

Como Argent pode ganhar:

- Categorizacao local com PACE.
- Regras personalizadas rapidas.
- Dashboard de gastos reais.
- Bills/subscricoes.
- Objetivos simples.
- Exportacao/spreadsheet para power users.

### Segmento B: Casal ou household pequeno

Perfil:

- 25-45 anos.
- Divide renda, supermercado, contas, transportes, subscricoes e ferias.
- Usa MB WAY/split bills.

Problemas:

- Nao sabe quanto custa realmente a casa.
- Gastos partilhados ficam em mensagens/transferencias.
- Orçamentos por categoria sao dificeis de manter.

Como Argent pode ganhar:

- Shared views no futuro.
- Tags por pessoa/casa/categoria.
- Bills recorrentes.
- Goals partilhados.
- Export e spreadsheets.

### Segmento C: Freelancer / trabalhador independente leve

Perfil:

- Precisa separar pessoal/profissional, mas nao quer accounting completo.
- Usa banco pessoal, Wise/Revolut, pagamentos por transferencia e recibos.

Problemas:

- Mistura despesas pessoais e profissionais.
- Precisa exportar movimentos.
- Categorizacao manual consome tempo.

Como Argent pode ganhar:

- Tags profissionais/pessoais.
- Export CSV.
- Regras PACE por merchant/descricao.
- Dashboard simples antes de passar para contabilista.

Limite:

- Nao deve vender como software contabilistico/fiscal completo sem produto e compliance adequados.

### Segmento D: Power user de spreadsheets

Perfil:

- Ja usa Google Sheets, Excel, Notion ou CSVs.
- Quer controlo e flexibilidade.

Problemas:

- Entrada manual chata.
- Bancos exportam formatos diferentes.
- Relatorios manuais partem facilmente.

Como Argent pode ganhar:

- Bank sync + workbook.
- Export/import.
- Regras configuraveis.
- Transparencia dos dados.

## 7. Concorrencia Direta

### Wallet by BudgetBakers

Categoria: PFM/budgeting com bank sync.

Sinais oficiais:

- Promete bank sync com mais de 15.000 instituicoes.
- Sincroniza e categoriza transacoes automaticamente.
- Fala em read-only access, encriptacao, PSD2 e ISO 27001.
- Tem budgets, reports, multi-currency e foco global.

Forcas:

- Produto maduro.
- Cobertura bancaria muito ampla.
- Marca clara em personal finance.
- Forte em mobile.

Fraquezas/oportunidades para Argent:

- Produto global pode nao tratar bem especificidades portuguesas.
- Pode ser demasiado abrangente.
- Localizacao e PACE podem diferenciar se a categorizacao portuguesa for melhor.

Risco competitivo: alto.

### Spendee

Categoria: budgeting, wallets, bank sync, shared wallets.

Sinais oficiais:

- Plano Basic gratuito.
- Plus e Premium pagos.
- Premium listado a USD 5.99/mes ou USD 35.99/ano no site consultado.
- Bank sync, automatic categorization, cash wallets, budgets, shared wallets, import/export e overview.

Forcas:

- Preco competitivo.
- Boa proposta para shared wallets e eventos.
- Freemium reduz friccao.

Fraquezas/oportunidades para Argent:

- Web budgets marcados como ainda nao totalmente no mesmo nivel que mobile no texto consultado.
- Copy e produto podem parecer genericos.
- Argent pode competir com experiencia web/desktop mais forte e spreadsheet integrado.

Risco competitivo: alto.

### Toshl Finance

Categoria: PFM com bank connections, budgeting e visualizacao.

Sinais oficiais:

- Usa parceiros Plaid e Salt Edge para ligacoes bancarias.
- Diz estar regulada por autoridades bancarias da UE e ter PSD2 AISP registration com o Bank of Slovenia.
- Explica que APIs oficiais redirecionam o utilizador para o banco e que credenciais nao sao verificadas pela app quando ha API.

Forcas:

- Produto antigo e conhecido.
- Forte enfase em seguranca e privacidade.
- Usa Salt Edge/Plaid, semelhante ao caminho tecnico da Argent.

Fraquezas/oportunidades para Argent:

- UX e posicionamento podem parecer menos modernos para alguns segmentos.
- Argent pode diferenciar por PACE, localizacao portuguesa e workspace.

Risco competitivo: medio a alto.

### YNAB

Categoria: budgeting metodologico, envelope/zero-based.

Sinais oficiais:

- Preco oficial consultado: USD 109/ano ou USD 14.99/mes.
- 34 dias de trial.
- Suporta partilha de subscricao com ate 5 pessoas adicionais.
- Direct import para bancos selecionados US, Canada, UK e UE.
- Nao suporta multi-currency dentro de um unico spending plan, segundo FAQ.
- Posicionamento muito forte em metodo e educacao financeira.

Forcas:

- Marca muito forte.
- Comunidade fiel.
- Metodo claro.
- Excelente educacao de produto.

Fraquezas/oportunidades para Argent:

- Preco alto para muitos utilizadores europeus/portugueses.
- Cobertura EU selectiva.
- Menos adaptado a MB WAY/Portugal.
- Foco em metodo pode ser demasiado rigido para quem quer apenas insight e organizacao.

Risco competitivo: medio para Portugal, alto para utilizadores que querem budgeting metodologico.

### Bankin'

Categoria: app francesa/europeia de gestao de dinheiro.

Sinais oficiais:

- Apresenta-se como app de gestao de dinheiro na Europa.
- Indica mais de 5,5 milhoes de utilizadores europeus.
- Permite ligar bancos entre mais de 350 instituicoes em 5 paises, incluindo Franca, Reino Unido, Espanha, Alemanha e Paises Baixos.
- Inclui budget, categorizacao, graficos, cashback, mini-credito e oportunidades de poupanca.
- Informa que atua como agente de Perspecteev, entidade de pagamento autorizada pela ACPR.

Forcas:

- Grande escala.
- Forte em Franca.
- Monetizacao por ofertas, credit/cashback e premium.

Fraquezas/oportunidades para Argent:

- Mais perto de marketplace financeiro.
- Mini-credito/cashback pode reduzir percepcao de neutralidade.
- Nao parece focada em Portugal.

Risco competitivo: alto em Franca, medio para Portugal.

### Emma

Categoria: money management app com agregacao, subscricoes, debt, credit score, savings, stocks e crypto.

Sinais oficiais:

- Ajuda a evitar overdrafts, cancelar subscricoes, track debt e poupar.
- Funcionalidades incluem all money in one place, budgets, spending, credit score, saving/interest, stocks, bank fees, salary notifications e refund/direct debit notifications.
- Suporta conexoes crypto como Coinbase, Kraken, Binance e outros.

Forcas:

- Produto amplo e agressivo em funcionalidades.
- Foco forte em subscricoes e insights.
- Pode atrair utilizadores que querem "financial advocate".

Fraquezas/oportunidades para Argent:

- Ao incluir stocks, credit score, savings e crypto, fica mais proxima de marketplace/super-app.
- Para um utilizador preocupado com simplicidade e privacidade, Argent pode posicionar-se como mais focada e menos comercial.

Risco competitivo: medio a alto, dependendo dos paises suportados.

### Snoop

Categoria: money management app UK, Open Banking, bills e savings suggestions.

Sinais oficiais:

- App gratuita de money management.
- Track spending, budgets, cut bills e controlo financeiro.
- Exige ligar pelo menos uma conta bancaria ou cartao para uso completo.
- Usa Open Banking para ligar contas.
- Foca contas, transacoes, budgets, bills e oportunidades de poupar.

Forcas:

- Muito claro em proposta de valor.
- Gratuito no ponto de entrada.
- Forte em bill savings e alerts.

Fraquezas/oportunidades para Argent:

- UK-focused.
- Oportunidades/ofertas podem tornar a experiencia mais comercial.
- Portugal/EU continental pode nao ser foco natural.

Risco competitivo: medio para UE continental, alto no UK.

### Moneyhub

Categoria: Open Banking/Open Finance, PFM e infraestrutura B2B/B2B2C.

Sinais oficiais:

- Posiciona-se como tecnologia de Open Banking e Open Finance.
- Oferece data aggregation e produtos que permitem ver financas num so lugar.
- O site consultado menciona budgeting, forecasting, analysis e conexoes financeiras.
- Indica que e AISP registado no contexto dos seus Open Banking APIs.
- Tem forte orientacao para white-label/embedded finance, nao apenas app direta ao consumidor.

Forcas:

- Forte credibilidade em Open Banking/Open Finance.
- Produto e infraestrutura para instituicoes financeiras.
- Pode cobrir casos mais amplos: banking, pensions, savings, investments e financial management.

Fraquezas/oportunidades para Argent:

- Mais enterprise/embedded do que indie consumer app.
- Pode parecer distante para utilizadores que querem uma ferramenta pessoal simples.
- Argent pode competir no nivel de experiencia final e localizacao, nao no nivel de infraestrutura.

Risco competitivo: medio direto, alto indireto se bancos/instituicoes usarem Moneyhub para criar PFMs embutidos.

### Actual Budget

Categoria: open-source, local-first, envelope budgeting.

Sinais oficiais:

- App rapida e privacy-focused.
- O utilizador e dono dos dados.
- Suporta multi-device sync, optional end-to-end encryption e self-hosting.
- Built-in bank sync via GoCardless para EU/UK e SimpleFIN para US/Canada.
- Importa QIF, OFX, QFX, CAMT.053 e CSV.
- Tem API.

Forcas:

- Forte para utilizadores tecnicos/privacy.
- Local-first e self-hostable.
- Open-source cria confianca.

Fraquezas/oportunidades para Argent:

- Setup pode ser demasiado tecnico para consumidor medio.
- Menos "finished consumer SaaS" para alguns utilizadores.
- Argent pode aprender com a transparencia/local-first sem exigir self-host.

Risco competitivo: alto para power users; medio para mainstream.

## 8. Concorrencia Indireta

### Apps dos bancos tradicionais

Forcas:

- Ja estao instaladas.
- Têm confianca e acesso nativo.
- Mostram saldos e pagamentos.
- Podem incluir categorias, goals ou insights basicos.

Fraquezas:

- Normalmente so mostram uma instituicao ou ecossistema.
- Categorizacao pode ser fraca.
- UX de orcamento costuma ser secundaria.
- Menos flexibilidade para regras personalizadas e spreadsheets.

Implicacao:

Argent tem de ser melhor que a app bancaria no trabalho de organizacao, nao no trabalho de banking.

### Neobanks: Revolut, N26, bunq, Wise

Forcas:

- UX forte.
- Cartoes, transferencias, wallets, pots/spaces, analytics.
- Forte adopcao entre jovens e expatriados.

Fraquezas:

- Tendem a organizar o dinheiro dentro da propria conta/ecossistema.
- Podem empurrar produtos financeiros.
- Nem sempre agregam bem bancos locais concorrentes.

Implicacao:

Argent nao deve competir como neobank. Deve ser a camada neutra por cima de bancos/neobanks.

### Spreadsheets e Notion

Forcas:

- Flexiveis.
- Gratuitos ou baratos.
- Total controlo.
- Bons para power users.

Fraquezas:

- Entrada manual.
- Erros.
- Categorizacao manual.
- Dificuldade de sync.
- Baixa aderencia a longo prazo.

Implicacao:

O workbook integrado da Argent pode ser um ponto forte se ligar dados reais a flexibilidade tipo spreadsheet.

### Contabilidade / business finance tools

Exemplos: accounting, invoicing, tax tools, SME dashboards.

Implicacao:

Nao sao concorrentes diretos se Argent ficar B2C/pessoal. Mas podem competir pelo segmento freelancer se Argent prometer demais.

## 9. Tabela Comparativa de Features

| Produto | Bank sync | Budgets | Categorizacao | Bills/subscricoes | Shared/household | Spreadsheets/workspace | Portugal/localizacao | Privacidade/dados | Risco para Argent |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Argent | Sim, via Salt Edge | Sim | PACE por regras | Bills | Nao claro/roadmap | Sim, workbook | Potencial forte PT | Depende da execucao; nao guarda credenciais | Produto em construcao |
| Wallet BudgetBakers | Sim | Sim | Automatica/AI | Parcial | Possivel | Nao principal | Global | Enfase em encriptacao/read-only | Alto |
| Spendee | Sim | Sim | Automatica | Parcial | Shared wallets | Nao principal | Global | "Secured data" | Alto |
| Toshl | Sim | Sim | Sim | Sim/recorrencias | Menos central | Nao principal | Global/EU | PSD2 AISP, Salt Edge/Plaid | Medio-alto |
| YNAB | Selectivo | Muito forte | Import/categorias | Goals/debt | YNAB Together | Nao | Limitado por bancos/moeda | Modelo pago, nao vender dados | Medio |
| Bankin' | Sim | Sim | Sim | Sim | Nao central | Nao | Forte Franca/alguns paises | ACPR via Perspecteev | Medio-alto |
| Emma | Sim | Sim | Sim | Forte em subscricoes | Nao principal | Nao | UK/US/Canada mais evidente | Produto amplo | Medio-alto |
| Snoop | Sim UK | Sim | Sim | Forte em bills | Nao central | Nao | UK | Open Banking | Medio |
| Moneyhub | Sim UK/Open Finance | Sim | Sim | Sim/forecasting | B2B/B2B2C | Nao principal | UK/institucional | AISP/Open Finance | Medio direto, alto indireto |
| Actual Budget | Sim EU/UK via GoCardless | Muito forte | Sim | Sim | Possivel por sync | API/local-first | Tecnico/global | Open-source, E2EE opcional | Alto para power users |
| Apps bancarias | Nativo | Basico | Basico | Basico | Nao | Nao | Forte local | Alta confianca institucional | Alto indireto |

## 10. Diferenciacao Possivel da Argent

Argent deve evitar tentar vencer por "tem bank sync". Isso e commodity no mercado.

Diferenciadores mais crediveis:

### 1. Localizacao portuguesa real

Nao apenas traduzir UI. Significa reconhecer padroes locais:

- MB WAY.
- MULTIBANCO.
- MB NET.
- Continente, Pingo Doce, Lidl, Auchan, Mercadona.
- Glovo, Uber Eats, Bolt Food.
- CP, Carris, Metro, Fertagus, Via Verde.
- telecoms e utilities portuguesas.
- rendas, condominio, propinas, IRS/Seguranca Social, IMI.
- descritores bancarios portugueses.

### 2. PACE como motor explicavel

Apps globais tendem a usar categorizacao automatica opaca. Argent pode tornar a categorizacao configuravel:

- regras visiveis;
- regex ou keywords simples;
- prioridade;
- sugestoes futuras;
- aprendizagem a partir de correcoes;
- reason codes;
- confidence score.

Mensagem de produto:

```text
Your categories should make sense to you, not to a black-box model.
```

### 3. Workspace financeiro, nao so dashboard

Dashboards mostram o passado. Workspaces permitem planear.

Argent tem oportunidade se combinar:

- dados bancarios;
- budgets;
- goals;
- bills;
- spreadsheet;
- export;
- cash-flow.

Isto coloca a app entre PFM simples e spreadsheet manual.

### 4. Neutralidade comercial

Muitas apps monetizam via ofertas, credito, cashback, marketplace financeiro ou upsells. Argent pode optar por:

- subscricao transparente;
- sem venda de dados;
- sem credito;
- sem produto financeiro empurrado;
- sem advice regulado.

Isto pode ser vantagem de confianca, especialmente para dados financeiros sensiveis.

### 5. Foco read-only

Mensagem importante:

- Argent organiza dados.
- Argent nao move dinheiro.
- Argent nao guarda credenciais.
- Argent nao tenta substituir o banco.

Isto ajuda marca, regulacao e confianca.

## 11. Posicionamento Recomendado

### Posicionamento curto

```text
Argent e um workspace de financas pessoais para transformar transacoes bancarias em orcamentos, bills, objetivos e insights acionaveis.
```

### Posicionamento para Portugal

```text
Argent ajuda-te a organizar contas, MB WAY, subscricoes, supermercado, bills e objetivos num unico espaco de financas pessoais.
```

### Posicionamento para UE

```text
Argent is a bank-connected personal finance workspace for budgeting, transaction categorization, bills, goals, and cash-flow planning.
```

### Frases a evitar

- "Argent is your bank."
- "Banking made simple."
- "The wallet for your money."
- "Pay with Argent."
- "Invest with Argent."
- "Crypto-ready finance."
- "Portfolio management."
- "Financial advice."

### Frases seguras

- "Personal finance workspace."
- "Budgeting and transaction insights."
- "Read-only bank-connected overview."
- "Organize spending, bills, goals, and cash-flow."
- "You stay in control of your categories."
- "Argent does not move money or hold deposits."

## 12. SWOT

### Strengths

- Produto focado em financas pessoais reais.
- Bank sync via Salt Edge reduz complexidade inicial.
- PACE pode ser diferenciador se evoluir para categorizacao explicavel.
- Bills, budgets, goals e spreadsheets formam conjunto coerente.
- Solo founder pode mover rapido e focar numa experiencia muito especifica.
- Portugal e bom mercado inicial para localizacao forte.

### Weaknesses

- Mercado cheio.
- Confiança e dificil quando se pede acesso a dados bancarios.
- Bank sync depende de terceiros e APIs bancarias.
- Produto ainda precisa de polish para competir com apps maduras.
- Sem marca legalmente cleared para publico.
- Sem comunidade, reviews ou prova social.
- Suporte ao cliente pode ser pesado para um solo founder.

### Opportunities

- Utilizadores frustrados com categorias ruins das apps dos bancos.
- Interesse em privacy-first finance tools.
- Necessidade de consolidar bancos tradicionais + neobanks.
- MB WAY e ecommerce geram transacoes que precisam de contexto.
- Open Finance/FiDA pode expandir dados alem de contas de pagamento.
- Portugal pode ser beachhead antes de Espanha/Franca/Benelux.
- AI/categorizacao explicavel pode melhorar UX sem virar caixa preta.

### Threats

- Bancos melhoram as suas apps.
- Apps PFM globais baixam preco ou melhoram PT.
- Regulacao muda ou fica mais pesada.
- Salt Edge/custos por utilizador tornam unit economics dificeis.
- Falhas de sincronizacao afetam confianca.
- Marca `Argent` pode ter risco com `ARGENTA`/outros.
- App stores e SEO sao caros e competitivos.
- Utilizadores podem abandonar se setup inicial for longo.

## 13. Porter Five Forces

### Rivalidade entre concorrentes: alta

Ha muitos produtos com features similares: bank sync, budgets, insights, categorization, bills. Para sobreviver, Argent precisa de foco e diferenciacao, nao lista generica de features.

### Ameaca de novos entrantes: media

Open Banking aggregators reduzem barreira tecnica, mas confianca, compliance, banco coverage e UX mantem alguma barreira. Micro-SaaS/indie tools continuam a surgir.

### Poder dos fornecedores: alto

Salt Edge ou outro aggregator e fornecedor critico. Custos, coverage, downtime, qualidade de dados e consent refresh impactam produto diretamente.

### Poder dos compradores: alto

Consumidores podem trocar para app do banco, spreadsheet ou app gratuita. Preco tem de ser justificado por valor recorrente.

### Ameaca de substitutos: muito alta

Substitutos incluem:

- app bancaria;
- Revolut/N26;
- MB WAY;
- Excel/Google Sheets;
- CSV manual;
- nao controlar financas de todo.

Argent tem de reduzir friccao mais do que o suficiente para vencer inercia.

## 14. Regulacao e Compliance

### PSD2 / Open Banking

PSD2 tornou possivel a existencia de Account Information Services e Payment Initiation Services. Se Argent usar Salt Edge como intermediario e nao for ela propria AISP regulado, deve refletir isso com precisao em termos, privacy e UX.

Pontos praticos:

- Nao dizer que Argent "acede diretamente" ao banco se Salt Edge e o fornecedor.
- Explicar que o utilizador autentica no hosted widget/fluxo do fornecedor.
- Explicar que Argent nao ve credenciais bancarias.
- Explicar scope de dados importados.
- Ser claro sobre revogacao de consentimento e eliminacao de dados.

### PSD3 / PSR

A Comissao Europeia tem proposta para PSD3 e Payment Services Regulation. Isto moderniza e revê PSD2, com efeitos futuros em open banking, strong customer authentication, fraude, direitos de consumidores e ambiente de pagamento.

Implicacao:

- Argent deve evitar acoplar copy e arquitetura a pressupostos que podem mudar.
- Se um dia adicionar pagamentos, o risco regulatorio sobe muito.

### FiDA / Open Finance

FiDA pretende criar um quadro para acesso e partilha de dados financeiros para alem de contas de pagamento, com direitos e obrigacoes para customer data sharing no setor financeiro.

Implicacao:

- A longo prazo, Argent poderia expandir para dados de seguros, pensoes, investimentos ou creditos.
- A curto prazo, nao deve prometer Open Finance completo.
- O roadmap pode mencionar "future open finance data" internamente, mas publicamente deve ser conservador.

### GDPR

Dados financeiros pessoais sao sensiveis em termos de confianca, mesmo quando nao sao "special category data" por definicao geral. Argent deve tratar como alto risco reputacional.

Minimos recomendados:

- Data minimization.
- Encriptacao em repouso e em transito.
- Separacao por utilizador.
- Export e delete account.
- Registo claro de subprocessadores.
- Privacy policy especifica para dados bancarios.
- Retencao limitada.
- Logs sem dados financeiros desnecessarios.

### Aconselhamento financeiro

Se a app disser "deves investir", "deves comprar", "este produto e ideal para ti" ou "esta e a melhor decisao financeira", pode aproximar-se de aconselhamento financeiro regulado ou pratica comercial arriscada.

Usar:

- insights;
- trends;
- alerts;
- summaries;
- user-configured goals.

Evitar:

- advice personalizado;
- recomendacoes de investimento;
- promessas de retorno;
- credito;
- scoring de risco financeiro sem base legal clara.

## 15. Modelo de Negocio

### Melhor modelo inicial: freemium limitado + subscricao barata

Para Portugal/UE, especialmente solo founder, o modelo mais simples:

- Free: tracking manual, numero limitado de contas/conexoes ou historico limitado.
- Plus: bank sync, PACE rules ilimitadas, budgets ilimitados, bills, goals, export.
- Pro/power: spreadsheets avancadas, regras avancadas, multi-account advanced reports, household, automations.

Preco indicativo:

- Portugal entry: EUR 3-5/mes ou EUR 30-45/ano.
- EU broader: EUR 5-8/mes ou EUR 50-80/ano.
- Evitar comecar acima de YNAB se nao houver metodologia/comunidade equivalente.

Por que:

- Spendee mostra preco baixo em annual.
- YNAB captura utilizadores dispostos a pagar, mas com marca/metodo forte.
- Apps gratuitas criam pressao.
- Custos de Salt Edge podem exigir monetizacao cedo.

### Evitar no inicio

- Monetizacao por credito.
- Monetizacao por marketplace financeiro.
- Vender dados.
- Cashback/offers como core.
- Crypto.

Isto reduz risco regulatorio, risco de marca e perda de confianca.

## 16. Go-to-Market para Solo Founder

### Em 15 dias

Objetivo: entregar credibilidade, nao escala.

Checklist:

- Landing/app copy segura: "personal finance workspace", nao banking.
- Demo flow funcional: ligar/simular conta, ver transacoes, aplicar PACE, budget, bill, goal.
- Estado vazio bem desenhado.
- Dados demo portugueses realistas.
- Secao clara: "Argent nao e banco e nao move dinheiro."
- Export funcional.
- Uma pagina de docs/FAQ de seguranca.
- Uma narrativa curta para avaliadores/clientes.

### 0-30 dias pos-entrega

Objetivo: validar interesse.

Acoes:

- 10-20 entrevistas com potenciais utilizadores portugueses.
- Teste com dados demo antes de pedir bank sync real.
- Medir tempo ate primeiro insight util.
- Observar onde PACE falha.
- Criar regras portuguesas default.
- Testar disposicao a pagar.
- Resolver copy juridicamente arriscada.

### 30-90 dias

Objetivo: beta privada.

Acoes:

- Beta com 30-100 utilizadores.
- Suporte manual muito atento.
- Registar problemas de sync por banco.
- Melhorar categorizacao por merchants portugueses.
- Adicionar edit-in-place de categorias e criacao de regra a partir da transacao.
- Melhorar bills/subscricoes recorrentes.
- Adicionar privacy/export/delete flows robustos.

### 90-180 dias

Objetivo: decidir se ha produto.

Acoes:

- Pricing experiment.
- Public launch pequeno em Portugal.
- Conteudo SEO em portugues: MB WAY, orcamento familiar, subscricoes, despesas mensais, categorizacao de gastos.
- Comunidade pequena no Discord/Telegram ou email list.
- Formal trademark clearance se a marca continuar.
- Roadmap para Espanha/Franca apenas depois de Portugal estar claro.

## 17. Roadmap de Produto Recomendado

### MVP comercial minimo

- Bank sync estavel ou modo demo/manual muito bom.
- Transacoes com pesquisa/filtro.
- Categorizacao PACE editavel.
- Criar regra a partir de transacao.
- Budgets por categoria.
- Bills recorrentes.
- Goals.
- Export CSV.
- Privacy/security page.
- Delete account/data.
- Copy segura e legalmente conservadora.

### Diferenciadores proximos

- Merchant normalization para Portugal.
- Templates de categorias portuguesas.
- Detecao de subscricoes recorrentes.
- MB WAY/P2P ambiguity handling.
- Confidence score para categorias.
- Confirmacao humana quando PACE tem baixa confianca.
- Cash-flow forecast simples.
- Spreadsheet ligada a dados reais.

### Depois

- Household/shared budgets.
- Multi-moeda com regras claras.
- Receipts/anexos.
- Import CAMT.053/CSV/OFX.
- API pessoal/export automations.
- Insights semanais por email.
- Apps mobile ou PWA polida.
- Open Finance expandido se FiDA amadurecer.

### Nao adicionar cedo

- Pagamentos.
- Wallet.
- Cartao.
- Credito.
- Investimentos.
- Crypto.
- Robo-advice.

Estes itens aumentam risco regulatorio, risco de marca e complexidade de suporte.

## 18. Riscos e Mitigacoes

### Risco: utilizador nao confia em ligar banco

Mitigacao:

- Explicar Salt Edge.
- Mostrar que Argent nao ve credenciais.
- Oferecer demo/manual mode.
- Privacy page clara.
- Logs e UI sem prometer mais do que faz.

### Risco: bank sync instavel

Mitigacao:

- Simulated sync para demo.
- Estado de conexao claro.
- Retry/backoff.
- Ultima sync visivel.
- Import CSV fallback.
- Nao culpar o utilizador.

### Risco: categorizacao errada

Mitigacao:

- PACE explicavel.
- One-click recategorize.
- Criar regra a partir de correcao.
- Baixa confianca fica em review.
- Default rules locais.

### Risco: mercado saturado

Mitigacao:

- Foco Portugal/UE.
- Foco MB WAY e descritores locais.
- Foco workspace/spreadsheet.
- Foco transparencia.
- Evitar competir com todas as features de todos os incumbentes.

### Risco: nome `Argent`

Mitigacao:

- Seguir relatorio de risco de marca.
- Evitar banking/wallet/payments/credit/invest.
- Criar `lib/brand.ts`.
- Fazer clearance antes de lancamento publico.
- Preparar modificador ou rename se necessario.

### Risco: regulacao

Mitigacao:

- Read-only.
- Sem pagamentos.
- Sem advice.
- Sem credito/investimento.
- Politicas claras.
- Revisao legal antes de beta publica.

### Risco: custos de aggregator

Mitigacao:

- Entender preco Salt Edge antes de escala.
- Limitar free tier com bank sync.
- Oferecer manual/CSV.
- Medir sync cost por utilizador ativo.

## 19. KPIs Recomendados

### Ativacao

- Percentagem que completa onboarding.
- Percentagem que liga banco ou importa dados demo/CSV.
- Tempo ate primeira transacao categorizada.
- Tempo ate primeiro budget criado.
- Tempo ate primeiro insight util.

### Retencao

- D1, D7, D30 retention.
- Numero de sessoes por semana.
- Numero de categorias corrigidas.
- Numero de regras PACE criadas.
- Percentagem de utilizadores que volta apos nova sync.

### Valor

- Transacoes categorizadas por utilizador.
- Percentagem de transacoes com categoria correta sem edicao.
- Bills/subscricoes identificadas.
- Budgets ativos por utilizador.
- Goals ativos por utilizador.
- Export/spreadsheet usage.

### Confianca

- Drop-off no momento de ligar banco.
- Cliques em security/privacy.
- Revogacoes de conexao.
- Pedidos de eliminacao de dados.
- Tickets sobre bank sync.

### Negocio

- Trial-to-paid.
- Free-to-paid.
- MRR.
- Churn.
- CAC, mesmo que inicialmente organico.
- Custo de Salt Edge por utilizador ativo.
- Margem por subscricao.

## 20. Estrategia de Conteudo

Se Argent lancar em Portugal, conteudo util pode adquirir utilizadores sem ads caros.

Topicos:

- Como organizar gastos MB WAY.
- Como controlar subscricoes mensais.
- Como criar budget mensal em Portugal.
- Como categorizar despesas de supermercado.
- Como separar despesas pessoais e freelancer.
- Como exportar movimentos para spreadsheet.
- Como usar Open Banking com seguranca.
- O que e PSD2 em linguagem simples.
- Como identificar gastos recorrentes.

Tom:

- pratico;
- sem promessas financeiras;
- sem "fica rico";
- sem aconselhamento de investimento;
- orientado a controlo e clareza.

## 21. Recomendacao Final de Mercado

Argent deve entrar no mercado como produto estreito e bem definido:

```text
Um workspace de financas pessoais, read-only, ligado a bancos, feito para organizar transacoes, budgets, bills, objetivos e cash-flow, com categorizacao explicavel e forte adaptacao a Portugal/UE.
```

O melhor beachhead:

- Portugal primeiro.
- Utilizadores digitais 20-40 anos.
- Pessoas com MB WAY + banco tradicional + Revolut/N26/Wise.
- Power users que hoje usam spreadsheets.
- Freelancers leves que querem organizar movimentos, sem substituir contabilidade.

O maior risco:

- Ser percebido como mais uma app de budgeting generica.

A forma de evitar isso:

- Foco em categorizacao local.
- PACE como feature central.
- Workspace/spreadsheet como diferenciador.
- Privacidade e read-only como narrativa de confianca.
- Copy conservadora para nao parecer banco/wallet/pagamentos.

Decisao pratica para o prazo:

1. Entregar com nome Argent.
2. Nao renomear agora.
3. Usar este estudo para moldar copy e roadmap.
4. Usar o relatorio de marca para evitar linguagem perigosa.
5. Fazer beta pequena em Portugal antes de qualquer expansao UE.

## 22. Fontes Consultadas

Fontes oficiais/regulatorias:

- European Commission - Framework for financial data access: https://finance.ec.europa.eu/digital-finance/framework-financial-data-access_en
- European Commission - Payment services / PSD2 / PSD3 / PSR / instant payments: https://finance.ec.europa.eu/consumer-finance-and-payments/payment-services/payment-services_en
- European Banking Authority - Register of payment and electronic money institutions under PSD2: https://www.eba.europa.eu/risk-and-data-analysis/data/registers/payment-institutions-register
- European Central Bank - Revised Payment Services Directive PSD2 overview: https://www.ecb.europa.eu/press/intro/mip-online/2018/html/1803_revisedpsd.en.html
- Eurostat - People online in 2024: https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20241217-1
- Eurostat - Digitalisation in Europe 2025: https://ec.europa.eu/eurostat/web/interactive-publications/digitalisation-2025
- OECD - Digital Financial Literacy in Portugal: https://www.oecd.org/en/publications/digital-financial-literacy-in-portugal_a43b0e0a-en.html
- Banco de Portugal - Report on Payment Systems 2024: https://www.bportugal.pt/en/publicacao/report-payment-systems-2024
- SIBS - 10 years of MB WAY: https://www.corporate.sibs.com/10-years-of-mb-way/
- Portugal Fintech Report 2025 landing: https://www.portugalfintech.org/portugalfintechreport2025
- KPMG / Portugal Fintech Report 2025 PDF: https://assets.kpmg.com/content/dam/kpmg/pt/pdf/pt-fintech-report-2025.pdf
- AICEP / PortugalGlobal summary of Portugal Fintech Report 2025: https://www.portugalglobal.pt/en/news/2025/december/portuguese-fintechs-attract-more-than-11-billion-in-investment/

Infraestrutura:

- Salt Edge Account Information / Data Aggregation: https://www.saltedge.com/products/account_information
- Salt Edge coverage: https://www.saltedge.com/products/account_information/coverage
- Salt Edge API docs v6: https://docs.saltedge.com/v6/

Concorrentes:

- Wallet by BudgetBakers - Bank Sync: https://new.budgetbakers.com/en/products/wallet/features/bank-sync/
- Wallet by BudgetBakers - Features: https://new.budgetbakers.com/en/products/wallet/features/
- Spendee Pricing: https://www.spendee.com/pricing
- Toshl Bank Connections: https://toshl.com/bank-connections/
- YNAB Pricing: https://www.ynab.com/pricing
- Emma Help - What is Emma: https://help.emma-app.com/en/article/what-is-emma-ku9lcg/
- Bankin' Help - Qu'est-ce que Bankin': https://support.bankin.com/hc/fr/articles/360020066272-Qu-est-ce-que-Bankin
- Snoop - How it works: https://www.snoop.app/how-it-works/
- Snoop Help - What is Snoop and how does it work: https://snoopadmin.zendesk.com/hc/en-gb/articles/360003754637-What-is-Snoop-and-how-does-it-work
- Moneyhub App: https://www.moneyhub.com/app
- Moneyhub Open Banking API: https://www.moneyhub.com/open-banking-api
- Moneyhub Data Aggregation: https://moneyhub.com/products/data-aggregation/
- Actual Budget: https://actualbudget.org/

Fontes locais do produto:

- [docs/Technical Documentation.md](../../docs/Technical%20Documentation.md)
- [docs/Bank Synchronization.md](../../docs/Bank%20Synchronization.md)
- [docs/PACE.md](../../docs/PACE.md)
- [docs/PACE Engine.md](../../docs/PACE%20Engine.md)
- [docs/Financial Features.md](../../docs/Financial%20Features.md)
