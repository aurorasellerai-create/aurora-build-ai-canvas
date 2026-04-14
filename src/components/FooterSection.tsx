import { Link } from "react-router-dom";

const FooterSection = () => (
  <footer className="py-12 px-4 border-t border-border" role="contentinfo">
    <div className="max-w-6xl mx-auto">
      <div className="grid sm:grid-cols-3 gap-8 mb-8">
        <div>
          <p className="font-display text-lg font-bold text-gradient-gold mb-3">Aurora Build AI</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Plataforma com inteligência artificial para criar aplicativos Android sem código.
            Crie, exporte e publique — tudo em um só lugar.
          </p>
        </div>

        <nav aria-label="Links rápidos">
          <p className="font-display text-sm font-bold text-foreground mb-3">Navegação</p>
          <ul className="space-y-2">
            <li><a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Planos e preços</a></li>
            <li><a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Perguntas frequentes</a></li>
            <li><Link to="/tools" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Ferramentas IA</Link></li>
            <li><Link to="/credits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Comprar créditos</Link></li>
          </ul>
        </nav>

        <nav aria-label="Começar">
          <p className="font-display text-sm font-bold text-foreground mb-3">Comece agora</p>
          <ul className="space-y-2">
            <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Criar conta grátis</Link></li>
            <li><Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Fazer login</Link></li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-border pt-6 text-center">
        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} Aurora Build AI. Todos os direitos reservados.
        </p>
      </div>
    </div>
  </footer>
);

export default FooterSection;
