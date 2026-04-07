import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface AuthBackButtonProps {
  to: string;
  label?: string;
}

const AuthBackButton = ({ to, label = "Voltar" }: AuthBackButtonProps) => (
  <Link
    to={to}
    className="absolute top-5 left-5 md:top-8 md:left-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-secondary transition-all duration-300 hover:scale-105 group"
    style={{ filter: "drop-shadow(0 0 6px hsl(190 100% 50% / 0.3))" }}
  >
    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-300" />
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

export default AuthBackButton;
