import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminGetHeroSlides, adminSaveHeroSlides, type HeroSlideItem } from "@/lib/admin.functions";
import { useState, useEffect } from "react";
import { Film, Image, Plus, Trash2, Save, CheckCircle2, Video, Eye, ArrowUp, ArrowDown, Upload, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/slideshow")({
  component: AdminSlideshowPage,
});

const DEFAULT_SLIDES: HeroSlideItem[] = [
  {
    id: "slide-1",
    title: "Real-Time Agent Analytics",
    subtitle: "Track daily commission earned & instant MoMo cashouts",
    tag: "🔴 LIVE DEMO",
    mediaType: "video",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    active: true,
    sortOrder: 1,
  },
  {
    id: "slide-2",
    title: "Instant Bulk Resell Engine",
    subtitle: "Top-up up to 500 phone numbers in a single click",
    tag: "⚡ HIGH SPEED",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
    active: true,
    sortOrder: 2,
  },
];

function AdminSlideshowPage() {
  const queryClient = useQueryClient();
  const getSlides = useServerFn(adminGetHeroSlides);
  const saveSlides = useServerFn(adminSaveHeroSlides);

  const { data, isLoading } = useQuery({
    queryKey: ["adminHeroSlides"],
    queryFn: () => getSlides(),
  });

  const [slides, setSlides] = useState<HeroSlideItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  useEffect(() => {
    if (data && data.length > 0) {
      setSlides(data);
    } else if (!isLoading && (!data || data.length === 0)) {
      setSlides(DEFAULT_SLIDES);
    }
  }, [data, isLoading]);

  const saveMutation = useMutation({
    mutationFn: (payload: HeroSlideItem[]) => saveSlides({ data: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminHeroSlides"] });
      queryClient.invalidateQueries({ queryKey: ["publicHeroSlides"] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const handleAddSlide = () => {
    const newSlide: HeroSlideItem = {
      id: `slide-${Date.now()}`,
      title: "New Promotion Slide",
      subtitle: "Enter description here…",
      tag: "NEW OFFER",
      mediaType: "image",
      mediaUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80",
      active: true,
      sortOrder: slides.length + 1,
    };
    setSlides([...slides, newSlide]);
    setActivePreviewIndex(slides.length);
  };

  const handleUpdateSlide = (index: number, updated: Partial<HeroSlideItem>) => {
    const updatedList = [...slides];
    updatedList[index] = { ...updatedList[index], ...updated };
    setSlides(updatedList);
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) {
      alert("You must keep at least 1 hero slide.");
      return;
    }
    const updated = slides.filter((_, i) => i !== index);
    setSlides(updated);
    if (activePreviewIndex >= updated.length) {
      setActivePreviewIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleMoveSlide = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slides.length) return;

    const list = [...slides];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    // Re-assign sortOrder
    const reordered = list.map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
    setSlides(reordered);
    setActivePreviewIndex(targetIndex);
  };

  const currentSlide = slides[activePreviewIndex] || slides[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h1 className="text-2xl font-black font-display tracking-tight flex items-center gap-2">
            <Film className="h-6 w-6 text-primary" /> Hero Slideshow & Media Manager
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Upload videos and images to display on the main website and agent storefront hero slideshows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" /> Slides Saved Live!
            </div>
          )}

          <button
            onClick={handleAddSlide}
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold hover:bg-muted transition-all"
          >
            <Plus className="h-4 w-4" /> Add Slide
          </button>

          <button
            onClick={() => saveMutation.mutate(slides)}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-black text-primary-foreground shadow-md hover:scale-105 active:scale-95 transition-all"
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? "Saving…" : "Save Slideshow"}
          </button>
        </div>
      </div>

      {/* Main Grid: Preview Player & Slide Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Live Media Player Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
                <Eye className="h-4 w-4" /> Live Hero Preview
              </h2>
              {currentSlide && (
                <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground bg-muted px-2 py-0.5 rounded-md">
                  {currentSlide.mediaType}
                </span>
              )}
            </div>

            {/* Media Player Container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center">
              {currentSlide ? (
                currentSlide.mediaType === "video" ? (
                  <video
                    key={currentSlide.mediaUrl}
                    src={currentSlide.mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={currentSlide.mediaUrl}
                    alt={currentSlide.title}
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <div className="text-xs text-muted-foreground">No slide selected</div>
              )}

              {/* Overlay Tag */}
              {currentSlide && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-white/20 text-[10px] font-black text-[hsl(48_100%_60%)] uppercase tracking-wider">
                  {currentSlide.tag || "PREVIEW"}
                </div>
              )}

              {/* Overlay Content */}
              {currentSlide && (
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 text-white">
                  <h4 className="text-sm font-bold tracking-tight font-display">{currentSlide.title}</h4>
                  <p className="text-[11px] text-white/70 truncate">{currentSlide.subtitle}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Slide List & Form Editors (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {slides.map((s, index) => (
            <div
              key={s.id}
              onClick={() => setActivePreviewIndex(index)}
              className={`rounded-3xl border p-6 shadow-sm transition-all space-y-4 cursor-pointer ${
                activePreviewIndex === index
                  ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/80 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-3">
                  <span className="h-6 w-6 rounded-full gold-gradient grid place-items-center text-xs font-black text-primary-foreground font-mono">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => handleUpdateSlide(index, { title: e.target.value })}
                    className="font-extrabold text-sm text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary outline-none px-1 py-0.5"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveSlide(index, "up");
                    }}
                    disabled={index === 0}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveSlide(index, "down");
                    }}
                    disabled={index === slides.length - 1}
                    className="p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSlide(index);
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-bold text-foreground block mb-1">Subtitle / Description</label>
                  <input
                    type="text"
                    value={s.subtitle}
                    onChange={(e) => handleUpdateSlide(index, { subtitle: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Tag / Badge Label</label>
                  <input
                    type="text"
                    value={s.tag}
                    onChange={(e) => handleUpdateSlide(index, { tag: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Media Format</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateSlide(index, { mediaType: "video" })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border font-bold ${
                        s.mediaType === "video" ? "bg-primary/15 text-primary border-primary/40" : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      <Film className="h-3.5 w-3.5" /> MP4 Video
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateSlide(index, { mediaType: "image" })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border font-bold ${
                        s.mediaType === "image" ? "bg-primary/15 text-primary border-primary/40" : "bg-background border-border text-muted-foreground"
                      }`}
                    >
                      <Image className="h-3.5 w-3.5" /> Image
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-1">Video / Image URL</label>
                  <input
                    type="text"
                    placeholder={s.mediaType === "video" ? "https://domain.com/demo.mp4" : "https://domain.com/banner.jpg"}
                    value={s.mediaUrl}
                    onChange={(e) => handleUpdateSlide(index, { mediaUrl: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
