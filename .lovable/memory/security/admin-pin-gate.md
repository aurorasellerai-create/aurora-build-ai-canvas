---
name: Admin Access Control
description: Acesso admin via verificação server-side de roles (has_role RPC), sem PIN client-side
type: feature
---
Acesso administrativo à rota '/admin' protegido por verificação de roles no banco de dados via `has_role()` RPC.
O componente `AdminPinGate` verifica se o usuário possui role 'admin' ou 'founder' no `user_roles`.
Não há mais PIN hardcoded no client-side. A função `adminLogout` redireciona para `/dashboard`.
