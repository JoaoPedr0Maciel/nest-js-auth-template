# Template de Ticket

Template pra feature nova, ajuste ou fix neste projeto — só regras de negócio e comportamento esperado. A parte técnica (estrutura de módulo, catálogo de erros, DTO vs Zod, Swagger, guards/roles, testes, cobertura) é responsabilidade de quem implementa e dos agentes em `.claude/agents/` (a começar pelo `ticket-planner`), não precisa ser decidida aqui.

---

## 1. Título

Curto, no imperativo, em PT-BR (ex: "permitir filtrar usuários por email na listagem", "corrigir logout não invalidando sessão antiga").

## 2. Tipo

- [ ] Feature nova
- [ ] Ajuste em algo existente
- [ ] Fix / correção

## 3. Contexto

Por que isso está sendo pedido? Qual problema resolve ou necessidade atende? (1-3 frases — se veio de outro lugar, cole o link/texto aqui também.)

## 4. Comportamento esperado

O que deve acontecer, do ponto de vista de quem usa — não como implementar, apenas o que o sistema deve fazer.

## 5. Regras de negócio

Condições, restrições e casos especiais que a implementação precisa respeitar. Exemplos do tipo de coisa que entra aqui:

- Quem pode fazer isso (todo mundo, só usuário autenticado, só admin)?
- O que é proibido ou precisa ser único (ex: "não pode existir dois usuários com o mesmo email")?
- Casos de borda relevantes pro negócio (ex: "o que acontece se o usuário já estiver desativado?").

## 6. Critérios de aceite

Lista de condições testáveis, uma por linha:

- [ ] ...
- [ ] ...

## 7. Fora de escopo

O que esse ticket **não** faz — evita scope creep e desalinhamento na review.
