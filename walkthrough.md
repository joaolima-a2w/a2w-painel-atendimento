# Documentação de Alterações - Painel A2W

Este documento detalha todas as modificações realizadas no sistema para integrar o Dashboard de Clientes e permitir a sincronização de dados entre múltiplos usuários.

## 1. Integração com a Barra Lateral (Layout)

### Alteração:
*   **Arquivo**: `frontend/src/App.jsx`
*   **Mudança**: A rota `/dashboard` foi movida de um estado "fullscreen" (sem sidebar) para dentro do componente `<Layout />`.
*   **Motivo**: Atender à solicitação do usuário de manter a barra lateral (acesso rápido, gerador de senhas, etc.) ativa enquanto navega no Dashboard de Clientes.

## 2. Persistência de Dados no Backend (Sincronização)

### Alteração:
*   **Arquivo**: `backend/src/api/main.py`
*   **Mudanças**:
    *   Criação de modelos Pydantic (`Company`, `Contact`, `AppStatus`) para tipagem dos dados da empresa.
    *   Implementação do endpoint `GET /dashboard/companies` para leitura centralizada dos dados.
    *   Implementação do endpoint `POST /dashboard/companies` para salvamento e atualização dos dados.
    *   Os dados são persistidos no arquivo `backend/data/companies.json`.
*   **Motivo**: O Dashboard utilizava apenas `LocalStorage`, o que tornava os dados locais ao navegador do usuário. Com os novos endpoints, quando um usuário sobe uma planilha, os dados são salvos no servidor e ficam disponíveis para todos os outros usuários do sistema.

## 3. Lógica de Sincronização no Dashboard

### Alteração:
*   **Arquivo**: `frontend/public/A2W-Dashboard.html`
*   **Mudanças**:
    *   Substituição da carga inicial via `LocalStorage` por uma chamada assíncrona (`fetch`) ao backend.
    *   Adição da função `saveToBackend()` que é disparada automaticamente após qualquer importação de arquivo Excel ou atualização de "Workers".
    *   Inclusão de cabeçalhos de autenticação (`Basic Auth`) nas requisições, utilizando as credenciais salvas no login do sistema principal.
*   **Motivo**: Garantir que o Dashboard "fale" com o servidor e mantenha os dados atualizados em tempo real conforme as ações de importação são realizadas.

## 4. Organização de Estilos

### Alteração:
*   **Arquivo**: `frontend/public/dashboard.css` (Criado)
*   **Mudança**: Extração das regras de CSS que estavam "inline" no HTML para um arquivo externo de folha de estilo.
*   **Motivo**: Melhorar a manutenção do código e seguir as melhores práticas de desenvolvimento web moderno.

## 5. Protocolo de Atualidade (Normas do Usuário)

### Implementação:
*   Uso de **CSS Variables** no arquivo `dashboard.css` para garantir consistência visual.
*   Uso de **Async/Await** em todas as novas funções de comunicação do Dashboard.
*   Garantia de compatibilidade com **APIs modernas de navegadores (2024+)**.

---
*Documentado em: 20/01/2026*
