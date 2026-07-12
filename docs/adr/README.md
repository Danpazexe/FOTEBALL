# Registros de Decisão de Arquitetura (ADR)

Cada arquivo `NNNN-titulo.md` registra **uma** decisão técnica relevante e o
raciocínio por trás dela — para que a intenção sobreviva ao tempo e a quem entra
no projeto depois.

Formato: Contexto · Decisão · Consequências · Alternativas consideradas · Status.

## Índice

| # | Decisão | Status |
|---|---------|--------|
| [0001](0001-adotar-design-system-v2.md) | Reconstruir a camada de apresentação como Design System v2 ("Sala de Análise"), em migração incremental por fases | Aceito |
| [0002](0002-inventario-fase-0.md) | Inventário Fase 0: baseline protegido + auditoria de tema/hex/listas/componentes/a11y | Concluído |
| [0003](0003-fase-1-fundacoes-plano.md) | Plano da Fase 1 (fundações: tokens, temas claro/escuro/sistema, primitives) | Proposto |

> Os ADRs cobrem **apresentação/experiência**. O motor determinístico, stores,
> persistência e regras de jogo seguem governados pelo `CLAUDE.md` na raiz.
