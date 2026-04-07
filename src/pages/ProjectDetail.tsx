import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Calendar, FileType, CheckCircle2, AlertCircle, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user && !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projeto excluído" });
      navigate("/dashboard");
    },
  });

  const handleDownload = () => {
    if (!project) return;
    const ext = project.format === "pwa" ? "zip" : project.format;
    const blob = new Blob([`Aurora Build AI - ${project.app_name}\nURL: ${project.site_url}\nFormato: ${ext.toUpperCase()}\nGerado em: ${new Date(project.created_at).toLocaleDateString("pt-BR")}`], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.app_name.replace(/\s+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado!" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Projeto não encontrado.</p>
          <Link to="/dashboard" className="text-primary hover:underline">Voltar ao dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-display font-bold text-lg text-gradient-gold">{project.app_name}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-aurora space-y-6">
          <div className="text-center">
            {project.status === "completed" ? (
              <CheckCircle2 className="w-16 h-16 text-secondary mx-auto mb-4" />
            ) : (
              <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            )}
            <h2 className="font-display text-xl font-bold text-foreground">
              {project.status === "completed" ? "App pronto!" : `Status: ${project.status}`}
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2"><FileType className="w-4 h-4" /> Formato</span>
              <span className="text-foreground font-semibold uppercase">{project.format}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground flex items-center gap-2"><Calendar className="w-4 h-4" /> Criado</span>
              <span className="text-foreground">{new Date(project.created_at).toLocaleDateString("pt-BR")}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">URL</span>
              <span className="text-secondary text-sm truncate max-w-[200px]">{project.site_url}</span>
            </div>
          </div>

          {project.status === "completed" && (
            <button
              onClick={handleDownload}
              className="w-full py-4 bg-primary text-primary-foreground font-display font-bold rounded-lg glow-gold glow-gold-hover transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Baixar App
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Tem certeza que deseja excluir este projeto?")) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="w-full py-3 border border-destructive/30 text-destructive font-semibold rounded-lg hover:bg-destructive/10 transition-all flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Excluir projeto
          </button>

          {project.error_message && (
            <p className="text-destructive text-sm text-center">{project.error_message}</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectDetail;
