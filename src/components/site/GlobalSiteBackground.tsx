import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPublicHeroSlides } from "@/lib/admin.functions";

export function GlobalSiteBackground() {
  const fetchSlides = useServerFn(getPublicHeroSlides);
  const { data: slides } = useQuery({
    queryKey: ["publicHeroSlides"],
    queryFn: () => fetchSlides(),
    staleTime: 60000,
  });

  const activeSlides = slides && slides.length > 0 ? slides : [
    {
      id: "mtn-eye-slide",
      title: "What Are We Doing Today?",
      subtitle: "Instant MTN Data Bundles at Wholesale Rates",
      tag: "🟡 MTN GHANA",
      mediaType: "image" as const,
      mediaUrl: "/backgrounds/mtn-eye-bg.jpg",
      active: true,
      sortOrder: 1,
    },
    {
      id: "mtn-sphere-slide",
      title: "Bestdata Ghana Hub",
      subtitle: "Automated MoMo Dispatch & Agent Portal",
      tag: "⚡ INSTANT DELIVERY",
      mediaType: "image" as const,
      mediaUrl: "/backgrounds/mtn-sphere-bg.jpg",
      active: true,
      sortOrder: 2,
    },
  ];

  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [activeSlides.length]);

  const currentSlide = activeSlides[slideIndex % activeSlides.length];

  if (!currentSlide?.mediaUrl) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
      {currentSlide.mediaType === "video" ? (
        <video
          key={currentSlide.mediaUrl}
          src={currentSlide.mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-85 transition-opacity duration-1000"
        />
      ) : (
        <img
          key={currentSlide.mediaUrl}
          src={currentSlide.mediaUrl}
          alt="Site Background"
          className="w-full h-full object-cover opacity-85 transition-opacity duration-1000"
        />
      )}
      {/* Light glass tint for readability across light/dark themes */}
      <div className="absolute inset-0 bg-background/55 backdrop-blur-[1px]" />
    </div>
  );
}
