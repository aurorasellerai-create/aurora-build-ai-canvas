

# Plano: Padronizar Logomarca Aurora Build AI

## Resumo

Substituir a logo PNG atual por duas versões otimizadas: um **SVG inline** para o topo (Navbar) e uma **PNG de alta qualidade com fundo transparente** para o centro (Hero/Splash). Adicionar animação de glow pulsante premium na logo central.

## O que será feito

### 1. Logo do Topo (Navbar) — SVG inline
- Criar um componente `AuroraLogo.tsx` com SVG inline representando o "A" com seta e "B" estilizados
- Gradiente dourado premium (#FFD700 → #B8860B) aplicado via SVG `<linearGradient>`
- Substituir `<img src={auroraSymbol}>` no `Navbar.tsx` pelo componente SVG
- Tamanho ajustado (~32-36px) com alinhamento perfeito ao texto "Aurora Build AI"
- SVG = 0 requests extras, escalável, nítido em qualquer resolução

### 2. Logo Central (Hero + Splash) — PNG otimizada com animação
- Usar a imagem uploaded como base, processar com AI para:
  - Remover fundo (transparência total)
  - Melhorar nitidez e contraste
  - Alta resolução sem pixelização
- Salvar como `src/assets/aurora-symbol.png` (substituir atual)
- Adicionar animação CSS de **glow pulsante dourado** sofisticado no `HeroSection.tsx`:
  - `box-shadow` / `drop-shadow` com `hsl(51 100% 50%)` pulsando suavemente
  - Keyframe `symbol-glow` com duração ~3s, ease-in-out, infinite
  - Leve e performático (apenas `filter` animado, sem layout shift)
- Mesma animação na `SplashScreen.tsx`

### 3. Componentes afetados
- **`src/components/AuroraLogo.tsx`** — Novo componente SVG
- **`src/components/Navbar.tsx`** — Trocar `<img>` por `<AuroraLogo />`
- **`src/components/HeroSection.tsx`** — Nova animação glow na logo central
- **`src/components/SplashScreen.tsx`** — Mesma animação glow
- **`src/assets/aurora-symbol.png`** — Substituir por versão limpa/transparente
- **`src/index.css`** — Keyframe `symbol-glow` se necessário

### 4. Performance
- SVG inline no topo: zero request HTTP adicional
- Animação via CSS `filter` apenas (GPU-accelerated, sem reflow)
- PNG central otimizada e comprimida

---

**Detalhes técnicos do SVG:**
O componente SVG será criado manualmente baseado no design da imagem uploaded (letra "A" dourada com seta ascendente e "B"). Usará `<linearGradient>` para o efeito gold e será dimensionável via props.

**Paleta:** `#FFD700` (gold), `#DAA520` (goldenrod), `#B8860B` (dark gold), fundo transparente.

