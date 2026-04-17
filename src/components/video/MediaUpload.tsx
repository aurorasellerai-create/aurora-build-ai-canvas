import { useRef, useState } from "react";
import { Upload, X, Image as ImageIcon, Film } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export type MediaItem = {
  id: string;
  file: File;
  url: string;
  type: "image" | "video";
};

interface Props {
  items: MediaItem[];
  onChange: (items: MediaItem[]) => void;
  maxItems?: number;
}

const ACCEPT = "image/jpeg,image/png,video/mp4";
const MAX_SIZE_MB = 50;
const MAX_VIDEO_SECONDS = 60;

const MediaUpload = ({ items, onChange, maxItems = 6 }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateAndAdd = async (files: FileList | File[]) => {
    const incoming = Array.from(files);
    const accepted: MediaItem[] = [];

    for (const file of incoming) {
      if (items.length + accepted.length >= maxItems) {
        toast({ title: "Limite atingido", description: `Máximo de ${maxItems} arquivos.`, variant: "destructive" });
        break;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: `${file.name} excede ${MAX_SIZE_MB}MB.`, variant: "destructive" });
        continue;
      }
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast({ title: "Formato inválido", description: "Use JPG, PNG ou MP4.", variant: "destructive" });
        continue;
      }
      if (isVideo) {
        const duration = await getVideoDuration(file).catch(() => 0);
        if (duration > MAX_VIDEO_SECONDS) {
          toast({ title: "Vídeo muito longo", description: `Máximo ${MAX_VIDEO_SECONDS}s. (${Math.round(duration)}s enviado)`, variant: "destructive" });
          continue;
        }
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
        type: isImage ? "image" : "video",
      });
    }
    if (accepted.length) onChange([...items, ...accepted]);
  };

  const remove = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) URL.revokeObjectURL(item.url);
    onChange(items.filter((i) => i.id !== id));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) validateAndAdd(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:border-secondary"
        }`}
      >
        <Upload className="w-8 h-8 mx-auto text-primary mb-2" />
        <p className="text-foreground text-sm font-medium">Adicionar imagem ou vídeo</p>
        <p className="text-muted-foreground text-xs mt-1">Arraste aqui ou clique • JPG, PNG, MP4 (até 60s, {MAX_SIZE_MB}MB)</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && validateAndAdd(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {items.map((item) => (
            <div key={item.id} className="relative group rounded-lg overflow-hidden bg-muted border border-border aspect-square">
              {item.type === "image" ? (
                <img src={item.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <video src={item.url} className="w-full h-full object-cover" muted />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                  className="w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  aria-label="Remover"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="absolute top-1 left-1 bg-background/80 rounded px-1.5 py-0.5 text-[10px] text-foreground flex items-center gap-1">
                {item.type === "image" ? <ImageIcon className="w-3 h-3" /> : <Film className="w-3 h-3" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration); };
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

export default MediaUpload;
