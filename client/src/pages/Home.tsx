/*
 * SONIA.IA — Page d'accueil
 * Design: BD Manga TikTok — style "Mon quotidien avec maman" de @lejtsonia
 * Éléments clés: titres rouge/jaune avec contour blanc, cases de BD, bulles de dialogue,
 *                fond crème/beige, couleurs vives, format TikTok vertical
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSoniaGenerator, useOpenAIStatus } from "@/hooks/useSonia";
import { useVideoMontage } from "@/hooks/useVideoMontage";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import {
  Sparkles,
  Music2,
  Download,
  Play,
  Heart,
  Star,
  Zap,
  Check,
  Menu,
  X,
  ArrowRight,
  Camera,
  Video,
  Mic,
} from "lucide-react";

// ── URLs des musiques libres de droits (CC BY Kevin MacLeod / CC0) ──────────────────
const MUSIC_TRACKS = {
  children: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/children-remix_138c4cd3.mp3",
  celtic: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/celtic-folk_30f9133a.mp3",
  family: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/piano-family_52d41a9c.mp3",
  joyful: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/joyful-ukulele_cf316cbb.mp3",
  nostalgia: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/nostalgia_827208ed.mp3",
  epic: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/epic-adventure_14de331f.mp3",
} as const;

type MusicTheme = keyof typeof MUSIC_TRACKS;

// ── URLs des assets générés ──────────────────────────────────────────
const COVER_MANGA = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-cover-manga-Bf2EBYke6WnHRNRpAf8dKs.webp";
const PAGE_BD = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-page-bd-Zixzmih5FALWaPvxSQcFfw.webp";
const HERO_SITE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-hero-site-Fr3tjfjjZoZoVon7t68uWs.webp";
const PROCESS_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-process-illustration-TyYxHC3XW3ANeXx5GkKWmG.webp";
const HERO_ORIGINAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/ChatGPTImage15mars2026%2C09_16_22-hqJzLNfJGaVKFPnRJjMNXj.webp";
const TIKTOK_VIDEO = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-tiktok-video_43026e73.mp4";

// ── Composant: Bulle de dialogue BD ─────────────────────────────────────────
function SpeechBubble({ text, direction = "left", className = "" }: { text: string; direction?: "left" | "right"; className?: string }) {
  return (
    <div className={`relative inline-block ${className}`}>
      <div
        className="bg-white border-2 border-gray-900 rounded-2xl px-3 py-2 text-xs font-bold text-gray-900 shadow-sm max-w-[140px]"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {text}
      </div>
      <div
        className={`absolute bottom-[-8px] ${direction === "left" ? "left-4" : "right-4"} w-0 h-0`}
        style={{
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: "10px solid #111",
        }}
      />
      <div
        className={`absolute bottom-[-6px] ${direction === "left" ? "left-4" : "right-4"} w-0 h-0`}
        style={{
          borderLeft: "7px solid transparent",
          borderRight: "7px solid transparent",
          borderTop: "9px solid white",
        }}
      />
    </div>
  );
}

// ── Composant: Titre style BD ─────────────────────────────────────────────────
function ComicTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1
      className={`font-black leading-tight ${className}`}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#FFD700",
        textShadow: "-3px -3px 0 #c0392b, 3px -3px 0 #c0392b, -3px 3px 0 #c0392b, 3px 3px 0 #c0392b, 0 0 0 #c0392b, -4px 0 0 #c0392b, 4px 0 0 #c0392b, 0 -4px 0 #c0392b, 0 4px 0 #c0392b",
        WebkitTextStroke: "3px #c0392b",
        paintOrder: "stroke fill",
      }}
    >
      {children}
    </h1>
  );
}

// ── Composant: Badge étoile ───────────────────────────────────────────────────
function StarBadge({ children, color = "#e63946" }: { children: React.ReactNode; color?: string }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md"
      style={{ background: color }}
    >
      <Star className="w-3 h-3 fill-current" />
      {children}
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-white/95 backdrop-blur-md shadow-md border-b-4 border-gray-900" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo BD style */}
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-gray-900 shadow-[2px_2px_0_#111]"
            style={{ background: "linear-gradient(135deg, #e63946, #FFD700)" }}
          >
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <span
              className="text-xl font-black"
              style={{
                color: "#e63946",
                textShadow: "1px 1px 0 #c0392b",
              }}
            >
              SONIA
            </span>
            <span className="text-xl font-black text-gray-900">.IA</span>
          </div>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {["Comment ça marche", "Galerie", "Tarifs", "À propos"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s/g, "").replace("çamarche", "comment")}`}
              className="text-sm font-bold text-gray-700 hover:text-red-600 transition-colors"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {item}
            </a>
          ))}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-gray-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                👋 {user?.name || user?.email}
              </span>
              <Button
                variant="outline"
                className="font-black px-4 py-2 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0_#111] hover:shadow-[1px_1px_0_#111] transition-all text-sm bg-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                onClick={() => logout()}
              >
                Déconnexion
              </Button>
              <a href="#generateur">
                <Button
                  className="text-white font-black px-5 py-2 rounded-lg border-2 border-gray-900 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
                  style={{ background: "linear-gradient(135deg, #e63946, #c0392b)", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ✨ Créer ma BD
                </Button>
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="font-black px-4 py-2 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0_#111] hover:shadow-[1px_1px_0_#111] transition-all text-sm bg-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                onClick={() => window.location.href = getLoginUrl()}
              >
                🔑 Se connecter
              </Button>
              <a href="#generateur">
                <Button
                  className="text-white font-black px-5 py-2 rounded-lg border-2 border-gray-900 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-sm"
                  style={{ background: "linear-gradient(135deg, #e63946, #c0392b)", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ✨ Créer ma BD
                </Button>
              </a>
            </div>
          )}
        </div>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white border-t-4 border-gray-900 px-4 py-4 space-y-3">
          {["Comment ça marche", "Galerie", "Tarifs", "À propos"].map((item) => (
            <a key={item} href="#" className="block text-sm font-bold text-gray-800 py-2 border-b border-gray-100" onClick={() => setMenuOpen(false)}>
              {item}
            </a>
          ))}
          {isAuthenticated ? (
            <>
              <div className="text-sm font-bold text-gray-700 py-2 border-b border-gray-100">
                👋 {user?.name || user?.email}
              </div>
              <Button
                variant="outline"
                className="w-full font-black rounded-lg border-2 border-gray-900 bg-white"
                onClick={() => { logout(); setMenuOpen(false); }}
              >
                Déconnexion
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full font-black rounded-lg border-2 border-gray-900 bg-white"
              onClick={() => window.location.href = getLoginUrl()}
            >
              🔑 Se connecter avec Google
            </Button>
          )}
          <Button
            className="w-full text-white font-black rounded-lg border-2 border-gray-900 shadow-[3px_3px_0_#111]"
            style={{ background: "linear-gradient(135deg, #e63946, #c0392b)" }}
            onClick={() => setMenuOpen(false)}
          >
            ✨ Créer ma BD
          </Button>
        </div>
      )}
    </nav>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative min-h-screen overflow-hidden" style={{ background: "#FFF8F0" }}>
      {/* Fond décoratif BD */}
      <div className="absolute inset-0 opacity-5">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute text-6xl font-black text-gray-900 select-none"
            style={{
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              transform: `rotate(${(i * 15) % 360}deg)`,
              opacity: 0.3,
            }}
          >
            {["★", "♥", "✦", "•"][i % 4]}
          </div>
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Texte gauche */}
          <div>
            {/* Badge */}
            <div className="mb-6">
              <StarBadge color="#4361ee">PROPULSÉ PAR L'IA — DALL-E 3 + GPT-4</StarBadge>
            </div>

            {/* Titre BD style */}
            <div className="mb-6">
              <ComicTitle className="text-5xl sm:text-6xl lg:text-7xl mb-2">
                Vos vidéos
              </ComicTitle>
              <ComicTitle className="text-5xl sm:text-6xl lg:text-7xl mb-2">
                TikTok
              </ComicTitle>
              <h2
                className="text-3xl sm:text-4xl font-black text-gray-900"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                en BD poétique !
              </h2>
            </div>

            {/* Bulle narrative */}
            <div
              className="bg-white border-4 border-gray-900 rounded-2xl p-5 mb-8 shadow-[5px_5px_0_#111] relative"
            >
              <div
                className="absolute -top-3 left-6 bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full border-2 border-gray-900"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                LE CONCEPT
              </div>
              <p className="text-base text-gray-700 leading-relaxed font-medium mt-2">
                Entrez un nom de profil TikTok. Notre IA analyse les vidéos, génère un scénario émouvant et illustre votre histoire en{" "}
                <strong className="text-red-600">1 couverture + 4 pages</strong>{" "}
                avec voix off humaine. En 30 secondes !
              </p>
            </div>

            {/* Stats BD style */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: "⚡", value: "30 sec", label: "de génération" },
                { icon: "🎨", value: "Style BD", label: "manga coloré" },
                { icon: "🎙️", value: "Voix off", label: "humaine" },
              ].map((stat, i) => (
                <div
                  key={i}
                  className="bg-white border-3 border-gray-900 rounded-xl p-3 text-center shadow-[3px_3px_0_#111]"
                  style={{ borderWidth: "3px" }}
                >
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="font-black text-sm text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{stat.value}</div>
                  <div className="text-xs text-gray-500 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#generateur">
                <Button
                  size="lg"
                  className="text-white font-black px-8 py-4 rounded-xl border-3 border-gray-900 shadow-[5px_5px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[3px] hover:translate-y-[3px] transition-all text-base w-full sm:w-auto"
                  style={{
                    background: "linear-gradient(135deg, #e63946, #c0392b)",
                    borderWidth: "3px",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Créer ma BD maintenant !
                </Button>
              </a>
              <a href="#galerie">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-black px-8 py-4 rounded-xl border-3 border-gray-900 shadow-[5px_5px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[3px] hover:translate-y-[3px] transition-all bg-white text-gray-900 text-base w-full sm:w-auto"
                  style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Play className="w-4 h-4 mr-2 fill-current" />
                  Voir des exemples
                </Button>
              </a>
            </div>
          </div>

          {/* Droite : Mockup BD TikTok */}
          <div className="relative flex justify-center lg:justify-end">
            {/* Téléphone TikTok avec la couverture BD */}
            <div className="relative">
              {/* Cadre téléphone */}
              <div
                className="relative w-64 sm:w-72 rounded-[2.5rem] border-4 border-gray-900 shadow-[8px_8px_0_#111] overflow-hidden"
                style={{ background: "#111", aspectRatio: "9/16" }}
              >
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-gray-900 rounded-full z-10" />
                {/* Image BD */}
                <img
                  src={COVER_MANGA}
                  alt="BD générée par SONIA.IA"
                  className="w-full h-full object-cover"
                />
                {/* Overlay TikTok UI */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-2 mb-1">
                    <Music2 className="w-3 h-3 text-white" />
                    <span className="text-white text-xs font-bold">@lejtsonia</span>
                  </div>
                  <p className="text-white text-xs opacity-80">Mon quotidien avec maman ❤️</p>
                </div>
                {/* Boutons TikTok côté droit */}
                <div className="absolute right-2 bottom-20 flex flex-col items-center gap-3">
                  <div className="flex flex-col items-center">
                    <Heart className="w-5 h-5 text-white fill-white" />
                    <span className="text-white text-xs">24.5K</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Download className="w-5 h-5 text-white" />
                    <span className="text-white text-xs">Partager</span>
                  </div>
                </div>
              </div>

              {/* Bulles flottantes */}
              <div className="absolute -top-4 -left-8 animate-bounce" style={{ animationDuration: "2s" }}>
                <SpeechBubble text="On va où aujourd'hui ?" />
              </div>
              <div className="absolute top-1/3 -right-10 animate-bounce" style={{ animationDuration: "2.5s" }}>
                <SpeechBubble text="À la plage maman !" direction="right" />
              </div>

              {/* Badge SONIA VIDEO */}
              <div
                className="absolute top-8 right-2 bg-blue-600 text-white text-xs font-black px-2 py-1 rounded-lg border-2 border-gray-900 shadow-[2px_2px_0_#111]"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                SONIA<br />VIDEO
              </div>

              {/* Étoiles décoratives */}
              <div className="absolute -bottom-4 -left-4 text-yellow-400 text-3xl animate-spin" style={{ animationDuration: "4s" }}>★</div>
              <div className="absolute -top-2 right-8 text-red-500 text-2xl animate-pulse">♥</div>
            </div>
          </div>
        </div>
      </div>

      {/* Séparateur BD */}
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gray-900" />
    </section>
  );
}

// ── Générateur TikTok ─────────────────────────────────────────────────────────
function GeneratorSection() {
  const [username, setUsername] = useState("");
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState<"tiktok" | "topic" | "photo">("tiktok");
  const [uploadedPhoto, setUploadedPhoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);

  const {
    generateFullBD,
    generateBDFromTopic,
    generateBDFromPhoto,
    scenario,
    tiktokProfile,
    audioDataUrl,
    generatedImages,
    pageAudios,
    isLoading,
    progress,
    currentStep,
  } = useSoniaGenerator();
  const [playingPageIndex, setPlayingPageIndex] = useState<number | null>(null);
  const pageAudioRefs = useRef<(HTMLAudioElement | null)[]>([null, null, null, null, null]);

  // Musique de fond
  const [bgMusicTheme, setBgMusicTheme] = useState<MusicTheme>("family");
  const [bgMusicPlaying, setBgMusicPlaying] = useState(false);
  const bgMusicRef = useRef<HTMLAudioElement>(null);

  const handleToggleBgMusic = () => {
    if (!bgMusicRef.current) return;
    if (bgMusicPlaying) {
      bgMusicRef.current.pause();
      setBgMusicPlaying(false);
    } else {
      bgMusicRef.current.volume = 0.3;
      bgMusicRef.current.loop = true;
      bgMusicRef.current.play().catch(() => {});
      setBgMusicPlaying(true);
    }
  };

  const handleChangeBgTheme = (theme: MusicTheme) => {
    setBgMusicTheme(theme);
    if (bgMusicRef.current) {
      bgMusicRef.current.pause();
      bgMusicRef.current.src = MUSIC_TRACKS[theme];
      if (bgMusicPlaying) {
        bgMusicRef.current.volume = 0.3;
        bgMusicRef.current.loop = true;
        bgMusicRef.current.play().catch(() => {});
      }
    }
  };

  const { data: apiStatus } = useOpenAIStatus();

  // Téléchargement d'une image BD (via fetch pour forcer le téléchargement)
  const handleDownloadImage = async (imageUrl: string, label: string) => {
    toast.info(`⬇️ Téléchargement de ${label} en cours...`);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `sonia-ia-${label.toLowerCase().replace(/\s+/g, "-")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(`✅ ${label} téléchargée !`);
    } catch {
      // Fallback : ouvrir dans un nouvel onglet
      window.open(imageUrl, "_blank");
      toast.success(`📥 Image ouverte — faites clic droit > Enregistrer l'image`);
    }
  };

  // Téléchargement de toutes les images BD
  const handleDownloadAllImages = () => {
    if (generatedImages.length === 0) {
      toast.error("Aucune image générée à télécharger !");
      return;
    }
    const labels = ["couverture", "page-1", "page-2", "page-3", "page-4"];
    generatedImages.forEach((url, i) => {
      setTimeout(() => handleDownloadImage(url, labels[i] ?? `image-${i}`), i * 500);
    });
    toast.success(`📥 Téléchargement de ${generatedImages.length} images BD !`);
  };

  const {
    assembleDemoMontage,
    assembleMontage,
    assembleMontage60s,
    downloadVideo,
    isAssembling,
    videoDataUrl,
    videoSize,
    videoDuration,
    assemblyProgress,
  } = useVideoMontage();

  const handleDownloadMP4 = async () => {
    if (generatedImages.length > 0 && pageAudios.length > 0) {
      // Mode 60 secondes : 5 segments avec voix off individuelles
      // panels[0] = couverture, panels[1-4] = pages
      const demoImages = [COVER_MANGA, PAGE_BD, COVER_MANGA, PAGE_BD, HERO_SITE];
      const segments = Array.from({ length: 5 }, (_, i) => ({
        imageUrl: generatedImages[i] ?? demoImages[i],
        audioBase64: pageAudios[i]
          ? pageAudios[i].replace("data:audio/mpeg;base64,", "")
          : undefined,
        label: i === 0 ? "Couverture" : `Page ${i}`,
      }));
      await assembleMontage60s(segments, scenario?.title);
    } else if (generatedImages.length > 0) {
      // Fallback : montage simple avec voix off globale
      const audioB64 = audioDataUrl
        ? audioDataUrl.replace("data:audio/mpeg;base64,", "")
        : undefined;
      await assembleMontage(generatedImages, audioB64, scenario?.title);
    } else {
      // Mode démo sans génération
      const audioB64 = audioDataUrl
        ? audioDataUrl.replace("data:audio/mpeg;base64,", "")
        : undefined;
      await assembleDemoMontage(audioB64);
    }
  };

  const done = !isLoading && scenario !== null;

  const handleGenerate = async () => {
    if (!username.trim()) {
      toast.error("Entrez un nom d'utilisateur TikTok !");
      return;
    }
    await generateFullBD(username.trim());
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image (JPG, PNG, WEBP) !");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image est trop grande (max 10 Mo) !");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setUploadedPhoto({ file, previewUrl });
    toast.success(`✅ Photo "${file.name}" chargée ! Cliquez sur "Générer la BD" pour créer votre BD.`);
  };

  const handleGenerateFromPhoto = async () => {
    if (!uploadedPhoto) {
      toast.error("Veuillez d'abord sélectionner une photo !");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      // Extraire la partie base64 (après la virgule)
      const base64 = dataUrl.split(",")[1];
      const mimeType = uploadedPhoto.file.type || "image/jpeg";
      await generateBDFromPhoto(base64, mimeType);
    };
    reader.readAsDataURL(uploadedPhoto.file);
  };

  const handlePlayVoice = () => {
    if (!audioRef.current || !audioDataUrl) {
      toast.info("Voix off en cours de génération...");
      return;
    }
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
    }
  };

  // Panels : 1 couverture + 4 pages avec images réelles (DALL-E) ou fallback statiques
  const panels = [
    {
      img: generatedImages[0] ?? COVER_MANGA,
      label: "Couverture",
      quote: scenario?.cover_quote ?? "Une histoire drôle et touchante.",
      voiceover: scenario?.cover_voiceover ?? scenario?.voiceover_text ?? "",
      audioDataUrl: pageAudios[0] ?? null,
      audioIndex: 0,
      isReal: !!generatedImages[0],
    },
    {
      img: generatedImages[1] ?? PAGE_BD,
      label: "Page 1",
      quote: scenario?.pages[0]?.narration ?? "Une nouvelle journée commence avec maman.",
      voiceover: scenario?.pages[0]?.voiceover ?? scenario?.pages[0]?.narration ?? "",
      audioDataUrl: pageAudios[1] ?? null,
      audioIndex: 1,
      isReal: !!generatedImages[1],
    },
    {
      img: generatedImages[2] ?? COVER_MANGA,
      label: "Page 2",
      quote: scenario?.pages[1]?.narration ?? "Mission : faire manger maman.",
      voiceover: scenario?.pages[1]?.voiceover ?? scenario?.pages[1]?.narration ?? "",
      audioDataUrl: pageAudios[2] ?? null,
      audioIndex: 2,
      isReal: !!generatedImages[2],
    },
    {
      img: generatedImages[3] ?? PAGE_BD,
      label: "Page 3",
      quote: scenario?.pages[2]?.narration ?? "À la plage, maman est la reine !",
      voiceover: scenario?.pages[2]?.voiceover ?? scenario?.pages[2]?.narration ?? "",
      audioDataUrl: pageAudios[3] ?? null,
      audioIndex: 3,
      isReal: !!generatedImages[3],
    },
    {
      img: generatedImages[4] ?? HERO_SITE,
      label: "Page 4",
      quote: scenario?.pages[3]?.narration ?? "Une fin pleine d'émotion.",
      voiceover: scenario?.pages[3]?.voiceover ?? scenario?.pages[3]?.narration ?? "",
      audioDataUrl: pageAudios[4] ?? null,
      audioIndex: 4,
      isReal: !!generatedImages[4],
    },
  ];

  // Lire/stopper la voix off d'une page
  const handlePlayPageAudio = (audioIndex: number) => {
    const audioEl = pageAudioRefs.current[audioIndex];
    if (!audioEl) return;
    if (playingPageIndex === audioIndex) {
      audioEl.pause();
      setPlayingPageIndex(null);
    } else {
      // Stopper tous les autres
      pageAudioRefs.current.forEach((el, i) => { if (el && i !== audioIndex) el.pause(); });
      if (audioRef.current) audioRef.current.pause();
      setAudioPlaying(false);
      audioEl.play();
      setPlayingPageIndex(audioIndex);
    }
  };

  return (
    <section id="generateur" className="py-20" style={{ background: "#FFF8F0" }}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Titre section */}
        <div className="text-center mb-12">
          <div
            className="inline-block bg-yellow-400 border-4 border-gray-900 rounded-2xl px-6 py-3 shadow-[5px_5px_0_#111] mb-6"
          >
            <ComicTitle className="text-3xl sm:text-4xl">
              Créez votre BD !
            </ComicTitle>
          </div>
          <p className="text-lg font-bold text-gray-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Entrez un nom TikTok et laissez la magie opérer ✨
          </p>
        </div>

        {/* Zone de saisie avec onglets */}
        <div
          className="bg-white border-4 border-gray-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#111] mb-8"
        >
          {/* Onglets TikTok / Sujet libre / Ma Photo */}
          <div className="flex flex-wrap gap-2 mb-5">
            <button
              onClick={() => setMode("tiktok")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-3 font-black text-sm transition-all ${
                mode === "tiktok"
                  ? "bg-gray-900 text-white border-gray-900 shadow-[3px_3px_0_#111]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-600"
              }`}
              style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Music2 className="w-4 h-4" />
              Profil TikTok
            </button>
            <button
              onClick={() => setMode("topic")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-3 font-black text-sm transition-all ${
                mode === "topic"
                  ? "bg-red-600 text-white border-red-600 shadow-[3px_3px_0_#c0392b]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-red-400"
              }`}
              style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Sparkles className="w-4 h-4" />
              Sujet libre
              <span className="text-xs bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded-full">NOUVEAU</span>
            </button>
            <button
              onClick={() => setMode("photo")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border-3 font-black text-sm transition-all ${
                mode === "photo"
                  ? "bg-blue-600 text-white border-blue-600 shadow-[3px_3px_0_#1d4ed8]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
              }`}
              style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <Camera className="w-4 h-4" />
              Ma Photo
              <span className="text-xs bg-green-400 text-gray-900 px-1.5 py-0.5 rounded-full">NOUVEAU</span>
            </button>
          </div>

          {mode === "tiktok" ? (
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              className="flex-1 flex items-center bg-gray-50 border-3 border-gray-900 rounded-xl overflow-hidden"
              style={{ borderWidth: "3px" }}
            >
              <span className="pl-4 text-gray-400 font-black text-lg">@</span>
              <Input
                type="text"
                placeholder="nom_tiktok"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                className="border-0 shadow-none text-lg font-bold bg-transparent focus-visible:ring-0 py-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading}
              className="text-white font-black px-8 py-4 rounded-xl border-3 border-gray-900 shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base"
              style={{
                background: "linear-gradient(135deg, #e63946, #c0392b)",
                borderWidth: "3px",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  En cours...
                </div>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Générer !
                </>
              )}
            </Button>
          </div>
          ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-red-50 border-2 border-red-200 rounded-xl px-4 py-2 text-xs font-bold text-red-700" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              🔍 L'IA recherche automatiquement sur internet (DuckDuckGo) et génère une BD sur n'importe quel sujet !
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="text"
                placeholder="Ex: Guerre au Moyen-Orient: l'Iran pose ses conditions..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && topic.trim() && generateBDFromTopic(topic.trim())}
                className="flex-1 border-3 border-gray-900 rounded-xl text-base font-bold bg-gray-50 focus-visible:ring-0 py-4 px-4"
                style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
              />
              <Button
                onClick={() => topic.trim() && generateBDFromTopic(topic.trim())}
                disabled={isLoading || !topic.trim()}
                className="text-white font-black px-8 py-4 rounded-xl border-3 border-gray-900 shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base"
                style={{
                  background: "linear-gradient(135deg, #e63946, #c0392b)",
                  borderWidth: "3px",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Recherche...
                  </div>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Créer BD !
                  </>
                )}
              </Button>
            </div>
            {/* Exemples de sujets */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-gray-500">Exemples :</span>
              {[
                "Guerre au Moyen-Orient",
                "Intelligence artificielle 2025",
                "Recette tarte aux pommes",
                "Voyage à Tokyo",
                "Histoire de Bretagne",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTopic(ex)}
                  className="text-xs font-bold bg-red-100 border-2 border-red-300 text-red-800 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
          )}

          {mode === "photo" && (
          <div className="flex flex-col gap-4">
            {/* Input file caché */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            {/* Zone de drop / bouton upload */}
            <div
              className="border-4 border-dashed border-blue-400 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all"
              onClick={() => photoInputRef.current?.click()}
              style={{ background: uploadedPhoto ? "#EFF6FF" : "#F8FAFF" }}
            >
              {uploadedPhoto ? (
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={uploadedPhoto.previewUrl}
                    alt="Photo chargée"
                    className="w-32 h-32 object-cover rounded-xl border-4 border-blue-500 shadow-[4px_4px_0_#1d4ed8]"
                  />
                  <p className="font-black text-blue-700 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    ✅ {uploadedPhoto.file.name}
                  </p>
                  <p className="text-xs text-blue-500 font-bold">Cliquez pour changer la photo</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-blue-100 border-4 border-blue-400 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="font-black text-blue-700 text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    📸 Cliquez pour choisir une photo
                  </p>
                  <p className="text-xs text-gray-500 font-bold">JPG, PNG, WEBP — max 10 Mo</p>
                  <p className="text-xs text-blue-600 font-bold bg-blue-100 px-3 py-1 rounded-full">
                    L'IA analyse votre photo et crée une BD personnalisée !
                  </p>
                </div>
              )}
            </div>
            {/* Bouton générer */}
            <Button
              onClick={handleGenerateFromPhoto}
              disabled={isLoading || !uploadedPhoto}
              className="text-white font-black px-8 py-4 rounded-xl border-3 border-gray-900 shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base"
              style={{
                background: uploadedPhoto ? "linear-gradient(135deg, #2563eb, #1d4ed8)" : "#9ca3af",
                borderWidth: "3px",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyse en cours...
                </div>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Générer ma BD depuis cette photo !
                </>
              )}
            </Button>
          </div>
          )}

          {mode === "tiktok" && (
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-xs font-bold text-gray-500">Essayer :</span>
            {["sonia.video5", "lejtsonia", "cyrilledorveaux76"].map((s) => (
              <button
                key={s}
                onClick={() => setUsername(s)}
                className="text-xs font-bold bg-yellow-100 border-2 border-yellow-400 text-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-200 transition-colors"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                @{s}
              </button>
            ))}
          </div>
          )}

          {/* ── Carte Profil TikTok (après récupération) ── */}
          {tiktokProfile && tiktokProfile.found && (
            <div className="mt-5 bg-gradient-to-r from-red-50 to-yellow-50 border-3 border-gray-900 rounded-2xl p-4 shadow-[3px_3px_0_#111] flex items-center gap-4" style={{ borderWidth: "3px" }}>
              {/* Avatar */}
              {tiktokProfile.avatar ? (
                <img
                  src={tiktokProfile.avatar}
                  alt={tiktokProfile.nickname}
                  className="w-14 h-14 rounded-full border-3 border-gray-900 shadow-[2px_2px_0_#111] flex-shrink-0 object-cover"
                  style={{ borderWidth: "3px" }}
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-3 border-gray-900 bg-red-400 flex items-center justify-center flex-shrink-0" style={{ borderWidth: "3px" }}>
                  <Music2 className="w-6 h-6 text-white" />
                </div>
              )}
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-gray-900 text-sm truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {tiktokProfile.nickname}
                  </span>
                  <span className="text-xs font-bold text-red-500">@{tiktokProfile.username}</span>
                </div>
                {tiktokProfile.signature && (
                  <p className="text-xs text-gray-600 font-medium truncate mb-2">{tiktokProfile.signature}</p>
                )}
                <div className="flex gap-3">
                  <span className="text-xs font-black text-gray-700">
                    <span className="text-red-600">{tiktokProfile.followerCount.toLocaleString()}</span> abonnés
                  </span>
                  <span className="text-xs font-black text-gray-700">
                    <span className="text-blue-600">{tiktokProfile.videoCount.toLocaleString()}</span> vidéos
                  </span>
                </div>
              </div>
              {/* Badge TikTok */}
              <div className="flex-shrink-0 bg-gray-900 text-white text-xs font-black px-3 py-1.5 rounded-xl border-2 border-gray-900 text-center" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ✅ Profil<br/>trouvé
                {tiktokProfile.source === "fastapi-scraper" && (
                  <div className="text-yellow-400 text-xs mt-0.5">🔗 Live</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barre de progression */}
        {isLoading && (
          <div
            className="bg-white border-4 border-gray-900 rounded-2xl p-6 shadow-[6px_6px_0_#111] mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-gray-800 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {currentStep}
              </span>
              <span
                className="font-black text-red-600 text-lg"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {progress}%
              </span>
            </div>
            <div className="h-4 bg-gray-200 rounded-full border-2 border-gray-900 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #e63946, #FFD700)",
                }}
              />
            </div>
            {/* Skeleton panels */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[3/4] rounded-xl border-2 border-gray-200 animate-pulse bg-gray-100"
                />
              ))}
            </div>
          </div>
        )}

        {/* Résultats */}
        {done && (
          <div className="animate-fade-in-up">
            <div
              className="bg-yellow-400 border-4 border-gray-900 rounded-2xl p-4 mb-6 shadow-[5px_5px_0_#111] flex items-center justify-between"
            >
              <div>
                <ComicTitle className="text-2xl">BD prête !</ComicTitle>
                <p className="text-sm font-bold text-gray-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Générée pour <span className="text-red-700">@{username}</span>
                </p>
              </div>
              <Button
                variant="outline"
                className="font-black border-3 border-gray-900 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all bg-white"
                style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
                onClick={handleDownloadMP4}
                disabled={isAssembling}
              >
                {isAssembling ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin" />
                    Montage {pageAudios.length > 0 ? "60s" : ""} ... {assemblyProgress}%
                  </div>
                ) : (
                  <><Download className="w-4 h-4 mr-2" /> {pageAudios.length > 0 ? "⏱️ Vidéo 60s" : "Télécharger MP4"}</>
                )}
              </Button>
            </div>

            {/* ── Lecteur Musique de Fond ── */}
            <div className="bg-gray-900 border-4 border-gray-900 rounded-2xl p-4 mb-6 shadow-[5px_5px_0_#111]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Music2 className="w-5 h-5 text-yellow-400" />
                  <span className="font-black text-white text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Musique de fond</span>
                  <span className="text-xs text-gray-400 font-medium">(libre de droits ✔)</span>
                </div>
                {/* Sélecteur de thème */}
                <div className="flex flex-wrap gap-2 flex-1">
                  {([
                    { key: "children" as MusicTheme, label: "🎵 Children", color: "#e63946" },
                    { key: "celtic" as MusicTheme, label: "🏴‍☠️ Bretagne", color: "#4361ee" },
                    { key: "family" as MusicTheme, label: "💖 Famille", color: "#e91e8c" },
                    { key: "joyful" as MusicTheme, label: "🎉 Humour", color: "#f4a261" },
                    { key: "nostalgia" as MusicTheme, label: "🌟 Souvenirs", color: "#9b59b6" },
                    { key: "epic" as MusicTheme, label: "⚡ Épique", color: "#27ae60" },
                  ] as const).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleChangeBgTheme(t.key)}
                      className={`text-xs font-black px-3 py-1.5 rounded-full border-2 transition-all ${
                        bgMusicTheme === t.key
                          ? "border-yellow-400 text-gray-900 shadow-[2px_2px_0_#FFD700]"
                          : "border-gray-600 text-gray-300 hover:border-gray-400"
                      }`}
                      style={{
                        background: bgMusicTheme === t.key ? t.color : "transparent",
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Bouton Play/Pause */}
                <button
                  onClick={handleToggleBgMusic}
                  className={`flex items-center gap-2 font-black text-sm px-4 py-2 rounded-xl border-2 transition-all flex-shrink-0 ${
                    bgMusicPlaying
                      ? "bg-yellow-400 border-yellow-400 text-gray-900 shadow-[2px_2px_0_#111]"
                      : "bg-white border-white text-gray-900 hover:bg-yellow-100"
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {bgMusicPlaying ? (
                    <><div className="flex gap-0.5"><div className="w-1 h-4 bg-gray-900 rounded" /><div className="w-1 h-4 bg-gray-900 rounded" /></div> Pause</>
                  ) : (
                    <><Play className="w-4 h-4 fill-current" /> Jouer</>
                  )}
                </button>
              </div>
              {/* Audio element caché */}
              <audio ref={bgMusicRef} src={MUSIC_TRACKS[bgMusicTheme]} preload="none" />
            </div>

            {/* Bouton télécharger toutes les images */}
            {generatedImages.length > 0 && (
              <div className="mb-4 flex justify-end">
                <button
                  onClick={handleDownloadAllImages}
                  className="flex items-center gap-2 text-sm font-black px-4 py-2 rounded-xl border-2 border-gray-900 bg-white shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  <Download className="w-4 h-4" />
                  Télécharger toutes les images ({generatedImages.length})
                </button>
              </div>
            )}

            {/* Grille de panels BD : 1 couverture + 4 pages */}
            {/* Couverture centrée, taille réduite */}
            <div className="mb-4 flex justify-center">
              {(() => {
                const cover = panels[0];
                return (
                  <div className="bg-white border-4 border-gray-900 rounded-2xl overflow-hidden shadow-[6px_6px_0_#111] relative w-full" style={{ maxWidth: "420px" }}>
                    {/* Image couverture */}
                    <div className="relative overflow-hidden group" style={{ aspectRatio: "3/4" }}>
                      <img
                        src={cover.img}
                        alt="Couverture BD"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Badge couverture */}
                      <div
                        className="absolute top-3 left-3 bg-red-500 text-white text-sm font-black px-3 py-1 rounded-full border-2 border-gray-900 shadow-md"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        🎨 Couverture
                      </div>
                      {/* Badge IA */}
                      {cover.isReal && (
                        <div
                          className="absolute top-3 right-3 bg-green-500 text-white text-xs font-black px-2 py-0.5 rounded-full border-2 border-gray-900"
                          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                        >
                          ✨ IA
                        </div>
                      )}
                      </div>
                    {/* Titre + voix off couverture */}
                    <div className="p-3 bg-yellow-50 border-t-4 border-gray-900 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-900 text-sm truncate" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                          {scenario?.title ?? "Votre BD"}
                        </p>
                        <p className="text-xs font-bold text-gray-600 italic mt-0.5 line-clamp-1">
                          {cover.voiceover || cover.quote}
                        </p>
                      </div>

                    {/* Audio couverture (résumé) */}
                      {cover.audioDataUrl && (
                        <>
                          <audio
                            ref={el => { pageAudioRefs.current[0] = el; }}
                            src={cover.audioDataUrl}
                            onEnded={() => setPlayingPageIndex(null)}
                          />
                          <Button
                            size="sm"
                            className="text-white font-black border-2 border-blue-800 bg-blue-600 hover:bg-blue-700 rounded-lg flex-shrink-0"
                            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                            onClick={() => handlePlayPageAudio(0)}
                          >
                            {playingPageIndex === 0 ? (
                              <><div className="w-3 h-3 mr-1 flex gap-0.5"><div className="w-1 h-3 bg-white rounded" /><div className="w-1 h-3 bg-white rounded" /></div> Pause</>
                            ) : (
                              <><Mic className="w-3 h-3 mr-1" /> Résumé</>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                    {/* GROS BOUTON TELECHARGER COUVERTURE - EN DEHORS DE L'IMAGE */}
                    <div className="p-3 border-t-4 border-red-600 bg-red-600">
                      <button
                        onClick={() => handleDownloadImage(cover.img, "Couverture")}
                        className="w-full flex items-center justify-center gap-3 text-lg font-black py-4 rounded-xl border-3 border-gray-900 bg-yellow-400 shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-y-[2px] transition-all"
                        style={{ fontFamily: "'Space Grotesk', sans-serif", borderWidth: "3px" }}
                      >
                        <Download className="w-6 h-6" />
                        📥 TÉLÉCHARGER L'IMAGE
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 4 pages en grille 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              {panels.slice(1).map((panel, i) => (
                <div
                  key={i + 1}
                  className="bg-white border-3 border-gray-900 rounded-xl overflow-hidden shadow-[4px_4px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all group"
                  style={{ borderWidth: "3px" }}
                >
                  <div className="aspect-[3/4] overflow-hidden relative">
                    <img
                      src={panel.img}
                      alt={panel.label}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Badge page */}
                    <div
                      className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded border border-gray-900"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {panel.label}
                    </div>
                    {/* Badge IA */}
                    {panel.isReal && (
                      <div
                        className="absolute top-2 right-2 bg-green-500 text-white text-xs font-black px-1.5 py-0.5 rounded border border-gray-900"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        ✨
                      </div>
                    )}
                    {/* Bouton voix off flottant */}
                    {panel.audioDataUrl && (
                      <button
                        className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center shadow-md hover:bg-blue-700 transition-colors"
                        onClick={() => handlePlayPageAudio(panel.audioIndex)}
                        title={`Voix off ${panel.label}`}
                      >
                        {playingPageIndex === panel.audioIndex ? (
                          <div className="flex gap-0.5">
                            <div className="w-1 h-3 bg-white rounded" />
                            <div className="w-1 h-3 bg-white rounded" />
                          </div>
                        ) : (
                          <Play className="w-3 h-3 text-white fill-white" />
                        )}
                      </button>
                    )}
                    {/* Bouton téléchargement image - TOUJOURS VISIBLE */}
                    <button
                      onClick={() => handleDownloadImage(panel.img, panel.label)}
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-xs font-black px-3 py-2 rounded-lg border-2 border-gray-900 bg-yellow-400 shadow-[2px_2px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-y-[1px] transition-all whitespace-nowrap"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      title={`Télécharger ${panel.label}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      📥 Image
                    </button>
                    {/* Élément audio caché */}
                    {panel.audioDataUrl && (
                      <audio
                        ref={el => { pageAudioRefs.current[panel.audioIndex] = el; }}
                        src={panel.audioDataUrl}
                        onEnded={() => setPlayingPageIndex(null)}
                      />
                    )}
                  </div>
                  <div className="p-2 bg-yellow-50 border-t-2 border-gray-900">
                    <p className="text-xs font-bold text-gray-700 italic leading-tight line-clamp-2 mb-2">
                      "{panel.voiceover || panel.quote}"
                    </p>
                  </div>
                  {/* GROS BOUTON TELECHARGER PAGE - EN DEHORS DE L'IMAGE */}
                  <div className="p-2 border-t-4 border-red-600 bg-red-600">
                    <button
                      onClick={() => handleDownloadImage(panel.img, panel.label)}
                      className="w-full flex items-center justify-center gap-2 text-sm font-black py-3 rounded-xl border-2 border-gray-900 bg-yellow-400 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-y-[1px] transition-all"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      <Download className="w-4 h-4" />
                      📥 TÉLÉCHARGER
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Voix off info */}
            <div
              className="mt-5 bg-blue-100 border-3 border-blue-600 rounded-xl p-4 shadow-[3px_3px_0_#2563eb] flex items-center gap-3"
              style={{ borderWidth: "3px" }}
            >
              <Mic className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <p className="font-black text-blue-800 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  🎤 {pageAudios.length > 0 ? `${pageAudios.length} voix off générées` : "Voix off humaine incluse"}
                </p>
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  {pageAudios.length > 0
                    ? "Couverture (résumé) + 4 pages — cliquez ▶ sur chaque page pour écouter"
                    : "Narration douce et naturelle — prête pour TikTok & Reels"}
                </p>
              </div>
              {/* Lecteur audio global (couverture) */}
              {audioDataUrl && (
                <audio
                  ref={audioRef}
                  src={audioDataUrl}
                  onEnded={() => setAudioPlaying(false)}
                  className="hidden"
                />
              )}
            </div>

            {/* ── Section Montage Vidéo MP4 ── */}
            {isAssembling && (
              <div className="mt-5 bg-white border-4 border-gray-900 rounded-2xl p-5 shadow-[5px_5px_0_#111]">
                <div className="flex items-center gap-3 mb-3">
                  <Video className="w-5 h-5 text-red-600" />
                  <span className="font-black text-gray-900 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    🎬 Montage vidéo en cours...
                  </span>
                  <span className="ml-auto font-black text-red-600">{assemblyProgress}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full border-2 border-gray-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${assemblyProgress}%`, background: "linear-gradient(90deg, #e63946, #FFD700)" }}
                  />
                </div>
                <p className="text-xs text-gray-500 font-medium mt-2">
                  FFmpeg assemble les planches BD + voix off en MP4 9:16 TikTok...
                </p>
              </div>
            )}

            {/* Lecteur vidéo MP4 généré */}
            {videoDataUrl && !isAssembling && (
              <div className="mt-5 bg-gray-900 border-4 border-gray-900 rounded-2xl overflow-hidden shadow-[5px_5px_0_#111]">
                {/* Header */}
                <div className="bg-yellow-400 border-b-4 border-gray-900 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-5 h-5 text-gray-900" />
                    <span className="font-black text-gray-900 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      🎬 Vidéo TikTok prête !
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700 font-bold">
                    <span>{videoDuration}s</span>
                    <span>•</span>
                    <span>{videoSize} MB</span>
                    <span>•</span>
                    <span>9:16</span>
                  </div>
                </div>

                {/* Lecteur vidéo */}
                <div className="flex justify-center bg-black p-4">
                  <video
                    src={videoDataUrl}
                    controls
                    autoPlay
                    loop
                    playsInline
                    className="rounded-xl border-2 border-gray-700"
                    style={{ maxHeight: "400px", maxWidth: "225px" }}
                  />
                </div>

                {/* Boutons d'action */}
                <div className="p-4 flex gap-3">
                  <Button
                    className="flex-1 text-white font-black border-3 border-gray-900 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    style={{ background: "linear-gradient(135deg, #e63946, #c0392b)", borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
                    onClick={downloadVideo}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger MP4
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 font-black border-3 border-gray-900 bg-white shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
                    style={{ borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
                    onClick={() => toast.info("Partage TikTok bientôt disponible !")}
                  >
                    <Music2 className="w-4 h-4 mr-2" />
                    Partager TikTok
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Comment ça marche ─────────────────────────────────────────────────────────
function HowItWorksSection() {
  return (
    <section id="comment" className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        {/* Titre */}
        <div className="text-center mb-14">
          <div
            className="inline-block bg-yellow-400 border-4 border-white rounded-2xl px-6 py-3 shadow-[5px_5px_0_rgba(255,255,255,0.3)] mb-4"
          >
            <ComicTitle className="text-3xl sm:text-4xl">
              Comment ça marche ?
            </ComicTitle>
          </div>
          <p className="text-gray-300 font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            4 étapes automatiques — de TikTok à votre BD
          </p>
        </div>

        {/* Image processus */}
        <div className="mb-12 rounded-2xl overflow-hidden border-4 border-white shadow-[8px_8px_0_rgba(255,255,255,0.2)]">
          <img src={PROCESS_IMG} alt="Processus SONIA.IA" className="w-full h-auto" />
        </div>

        {/* Détail des étapes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              num: "01",
              icon: <Music2 className="w-6 h-6" />,
              title: "Analyse TikTok",
              desc: "L'IA scanne le profil TikTok et extrait les moments les plus touchants : thèmes, émotions, personnages.",
              color: "#e63946",
            },
            {
              num: "02",
              icon: <Sparkles className="w-6 h-6" />,
              title: "Direction artistique",
              desc: "DALL-E 3 génère des illustrations en style BD manga coloré avec personnages cohérents sur toutes les planches.",
              color: "#4361ee",
            },
            {
              num: "03",
              icon: <Mic className="w-6 h-6" />,
              title: "Voix off humaine",
              desc: "Une narration douce et naturelle porte le texte. Jamais robotique — parfaite pour les réseaux sociaux.",
              color: "#f4a261",
            },
            {
              num: "04",
              icon: <Video className="w-6 h-6" />,
              title: "Export vidéo",
              desc: "Vidéo prête pour TikTok, Reels ou YouTube Shorts. 5 secondes = 0,20€ / 10 secondes = 0,50€.",
              color: "#27ae60",
            },
          ].map((s, i) => (
            <div
              key={i}
              className="bg-white border-4 border-white rounded-2xl p-6 shadow-[5px_5px_0_rgba(255,255,255,0.2)] hover:shadow-[2px_2px_0_rgba(255,255,255,0.2)] hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
            >
              <div
                className="w-12 h-12 rounded-xl border-3 border-gray-900 flex items-center justify-center text-white mb-4 shadow-[3px_3px_0_#111]"
                style={{ background: s.color, borderWidth: "3px" }}
              >
                {s.icon}
              </div>
              <div
                className="text-4xl font-black opacity-10 mb-2 text-gray-900"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {s.num}
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {s.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Section Avant / Après ────────────────────────────────────────────────────
function BeforeAfterSection() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePanel, setActivePanel] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const panels = [
    { img: COVER_MANGA, label: "Couverture", time: "0:00", quote: "Mon quotidien avec maman ❤️" },
    { img: PAGE_BD, label: "Page 1", time: "0:18", quote: "Une nouvelle journée commence avec maman." },
    { img: COVER_MANGA, label: "Page 2", time: "0:33", quote: "Mission : faire manger maman." },
    { img: PAGE_BD, label: "Page 3", time: "0:47", quote: "À la plage, maman est la reine !" },
  ];

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    if (t < 18) setActivePanel(0);
    else if (t < 33) setActivePanel(1);
    else if (t < 47) setActivePanel(2);
    else setActivePanel(3);
  };

  return (
    <section id="avantapres" className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        {/* Titre */}
        <div className="text-center mb-12">
          <div className="inline-block bg-yellow-400 border-4 border-white rounded-2xl px-6 py-3 shadow-[5px_5px_0_rgba(255,255,255,0.3)] mb-4">
            <ComicTitle className="text-3xl sm:text-4xl">Avant / Après</ComicTitle>
          </div>
          <p className="text-gray-300 font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            La vraie vidéo TikTok de <span className="text-yellow-400">@lejtsonia</span> transformée en BD
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

          {/* ── GAUCHE : Lecteur vidéo TikTok ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-500 border-3 border-white rounded-full px-4 py-1 shadow-[3px_3px_0_rgba(255,255,255,0.3)]" style={{ borderWidth: "3px" }}>
                <span className="text-white font-black text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>AVANT — Vidéo TikTok 60 sec</span>
              </div>
            </div>

            {/* Cadre téléphone TikTok */}
            <div className="relative mx-auto" style={{ maxWidth: "320px" }}>
              <div
                className="relative rounded-[2.5rem] border-4 border-white overflow-hidden shadow-[8px_8px_0_rgba(255,255,255,0.2)]"
                style={{ background: "#000", aspectRatio: "9/16" }}
              >
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-20" />

                {/* Vidéo */}
                <video
                  ref={videoRef}
                  src={TIKTOK_VIDEO}
                  className="w-full h-full object-cover"
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  loop={false}
                />

                {/* Overlay UI TikTok */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Barre du haut */}
                  <div className="absolute top-6 left-0 right-0 flex justify-between items-center px-4">
                    <span className="text-white text-xs font-bold bg-black/40 px-2 py-0.5 rounded-full">Pour toi</span>
                    <div className="bg-red-500 text-white text-xs font-black px-2 py-1 rounded-lg border border-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                      SONIA<br />VIDEO
                    </div>
                  </div>

                  {/* Boutons côté droit */}
                  <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4">
                    <div className="flex flex-col items-center">
                      <Heart className="w-7 h-7 text-white fill-white" />
                      <span className="text-white text-xs font-bold">24.5K</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Music2 className="w-6 h-6 text-white" />
                      <span className="text-white text-xs font-bold">Son</span>
                    </div>
                  </div>

                  {/* Info bas */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2 mb-1">
                      <Music2 className="w-3 h-3 text-white" />
                      <span className="text-white text-xs font-black">@lejtsonia</span>
                    </div>
                    <p className="text-white text-xs opacity-80">Mon quotidien avec maman ❤️ #maman #famille</p>
                  </div>
                </div>

                {/* Bouton Play/Pause centré */}
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 flex items-center justify-center z-10 group"
                >
                  <div
                    className={`w-16 h-16 rounded-full border-4 border-white flex items-center justify-center transition-all duration-300 ${
                      isPlaying ? "opacity-0 group-hover:opacity-80" : "opacity-90"
                    }`}
                    style={{ background: "rgba(0,0,0,0.5)" }}
                  >
                    {isPlaying ? (
                      <div className="flex gap-1.5">
                        <div className="w-2 h-7 bg-white rounded" />
                        <div className="w-2 h-7 bg-white rounded" />
                      </div>
                    ) : (
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    )}
                  </div>
                </button>
              </div>

              {/* Barre de progression vidéo */}
              <div className="mt-3 bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full transition-all duration-300"
                  style={{ width: `${(activePanel / 3) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 font-bold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <span>0:00</span>
                <span>1:00</span>
              </div>
            </div>
          </div>

          {/* ── DROITE : BD générée ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-yellow-400 border-3 border-white rounded-full px-4 py-1 shadow-[3px_3px_0_rgba(255,255,255,0.3)]" style={{ borderWidth: "3px" }}>
                <span className="text-gray-900 font-black text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>APRÈS — BD générée par IA ✨</span>
              </div>
            </div>

            {/* Grille de panels BD synchronisée */}
            <div className="grid grid-cols-2 gap-3">
              {panels.map((panel, i) => (
                <div
                  key={i}
                  className={`bg-white border-4 rounded-2xl overflow-hidden transition-all duration-500 cursor-pointer ${
                    activePanel === i
                      ? "border-yellow-400 shadow-[0_0_20px_rgba(255,215,0,0.6)] scale-105"
                      : "border-gray-600 opacity-70 hover:opacity-90"
                  }`}
                  onClick={() => {
                    setActivePanel(i);
                    if (videoRef.current) {
                      const times = [0, 18, 33, 47];
                      videoRef.current.currentTime = times[i];
                    }
                  }}
                >
                  <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                    <img
                      src={panel.img}
                      alt={panel.label}
                      className="w-full h-full object-cover"
                    />
                    {/* Badge temps */}
                    <div
                      className={`absolute top-2 left-2 text-xs font-black px-2 py-0.5 rounded-full border-2 border-gray-900 ${
                        activePanel === i ? "bg-yellow-400 text-gray-900" : "bg-gray-800 text-white"
                      }`}
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {panel.time}
                    </div>
                    {/* Indicateur actif */}
                    {activePanel === i && (
                      <div className="absolute inset-0 border-4 border-yellow-400 rounded-xl pointer-events-none" />
                    )}
                  </div>
                  <div className="p-2 border-t-2 border-gray-200" style={{ background: activePanel === i ? "#FEFCE8" : "#FFF8F0" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black text-red-600" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{panel.label}</span>
                      {activePanel === i && <span className="text-xs text-yellow-600 font-black">▶ EN COURS</span>}
                    </div>
                    <p className="text-xs text-gray-600 italic font-medium leading-tight line-clamp-2">"{panel.quote}"</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Légende */}
            <div className="mt-4 bg-white/10 border-2 border-white/20 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white font-black text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Synchronisation automatique
                </p>
                <p className="text-gray-400 text-xs font-medium mt-1">
                  Les planches BD s'illuminent en temps réel selon la progression de la vidéo. Cliquez sur une planche pour naviguer dans la vidéo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Galerie ───────────────────────────────────────────────────────────────────
function GallerySection() {
  return (
    <section id="galerie" className="py-20" style={{ background: "#FFF8F0" }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <div
            className="inline-block bg-red-500 border-4 border-gray-900 rounded-2xl px-6 py-3 shadow-[5px_5px_0_#111] mb-4"
          >
            <h2
              className="text-3xl sm:text-4xl font-black text-white"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                textShadow: "2px 2px 0 #c0392b",
              }}
            >
              Galerie de BD
            </h2>
          </div>
          <p className="text-gray-700 font-bold text-base" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Créations générées à partir de profils TikTok réels
          </p>
        </div>

        {/* Grille galerie */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Mon quotidien avec maman",
              profile: "@lejtsonia",
              theme: "Famille & Humour",
              img: COVER_MANGA,
              quote: "Une histoire drôle et touchante.",
              color: "#e63946",
            },
            {
              title: "Le chapeau de maman",
              profile: "@lejtsonia",
              theme: "Démence frontotemporale",
              img: PAGE_BD,
              quote: "Pourtant il est très confortable !",
              color: "#4361ee",
            },
            {
              title: "La plage avec maman",
              profile: "@lejtsonia",
              theme: "Souvenirs & Tendresse",
              img: HERO_SITE,
              quote: "Maman est la reine de la plage.",
              color: "#f4a261",
            },
          ].map((ex, i) => (
            <div
              key={i}
              className="bg-white border-4 border-gray-900 rounded-2xl overflow-hidden shadow-[6px_6px_0_#111] hover:shadow-[3px_3px_0_#111] hover:translate-x-[3px] hover:translate-y-[3px] transition-all group"
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ aspectRatio: "3/4" }}>
                <img
                  src={ex.img}
                  alt={ex.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {/* Badge thème */}
                <div
                  className="absolute top-3 left-3 text-white text-xs font-black px-3 py-1 rounded-full border-2 border-white shadow-md"
                  style={{ background: ex.color, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {ex.theme}
                </div>
                {/* Quote */}
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="bg-white/90 border-2 border-gray-900 rounded-xl px-3 py-2">
                    <p className="text-xs font-bold text-gray-800 italic">"{ex.quote}"</p>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 border-t-4 border-gray-900" style={{ background: "#FFF8F0" }}>
                <h3 className="font-black text-gray-900 text-base mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  {ex.title}
                </h3>
                <div className="flex items-center gap-1 text-sm text-gray-500 font-bold mb-3">
                  <Music2 className="w-3 h-3" />
                  {ex.profile}
                </div>
                <div className="flex gap-2">
                  <button
                    className="flex-1 text-xs font-black py-2 rounded-lg border-2 border-gray-900 bg-yellow-400 text-gray-900 shadow-[2px_2px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    onClick={() => toast.info("Lecture bientôt disponible !")}
                  >
                    ▶ Voix off
                  </button>
                  <button
                    className="flex-1 text-xs font-black py-2 rounded-lg border-2 border-gray-900 bg-white text-gray-900 shadow-[2px_2px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    onClick={() => toast.info("Téléchargement bientôt disponible !")}
                  >
                    ↓ Télécharger
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── À propos ──────────────────────────────────────────────────────────────────
function AboutSection() {
  return (
    <section id="apropos" className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <div className="border-4 border-white rounded-2xl overflow-hidden shadow-[8px_8px_0_rgba(255,255,255,0.2)]">
              <img src={HERO_ORIGINAL} alt="SONIA.IA" className="w-full h-72 lg:h-96 object-cover" />
            </div>
            {/* Floating card */}
            <div
              className="absolute -bottom-5 -right-5 bg-yellow-400 border-4 border-gray-900 rounded-2xl p-4 shadow-[5px_5px_0_#111] max-w-[200px]"
            >
              <div className="flex items-center gap-2 mb-1">
                <Heart className="w-4 h-4 text-red-600 fill-current" />
                <span className="font-black text-gray-900 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Générateur d'émotions
                </span>
              </div>
              <p className="text-xs text-gray-700 font-medium">
                Vos souvenirs TikTok fixés pour toujours en BD.
              </p>
            </div>
          </div>

          {/* Texte */}
          <div>
            <div
              className="inline-block bg-yellow-400 border-4 border-white rounded-2xl px-5 py-2 shadow-[4px_4px_0_rgba(255,255,255,0.3)] mb-6"
            >
              <ComicTitle className="text-2xl sm:text-3xl">Le projet SONIA.IA</ComicTitle>
            </div>

            <div
              className="bg-white/10 border-3 border-white/30 rounded-2xl p-6 mb-6"
              style={{ borderWidth: "3px" }}
            >
              <p className="text-white text-base leading-relaxed font-medium">
                <strong className="text-yellow-400 font-black">SONIA.IA est un générateur d'émotions automatisé.</strong>{" "}
                Il transforme les témoignages vidéos de TikTok en bandes dessinées poétiques animées. Le projet vise à capturer l'essence des récits de vie — famille, transmission, souvenirs — pour les transformer en œuvres d'art numériques durables.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Style BD manga coloré — aquarelle moderne",
                "Personnages cohérents sur toutes les planches",
                "Voix off humaine et apaisante (non robotique)",
                "Export vidéo prêt pour TikTok & Reels",
                "0,20€ / vidéo 5 sec — 0,50€ / vidéo 10 sec",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0"
                    style={{ background: "#e63946" }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-white font-bold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Tarifs ────────────────────────────────────────────────────────────────────
function PricingSection() {
  // Packs 30 secondes
  const packs30sec = [
    {
      name: "Découverte",
      price: "0,49€",
      qty: "1 vidéo",
      unitPrice: "0,49€ / vidéo",
      features: ["1 BD complète", "Couverture + 4 pages", "Voix off humaine", "Export MP4 30 sec", "Musique de fond"],
      cta: "Essayer à 0,49€",
      color: "#059669",
      bg: "#ECFDF5",
    },
    {
      name: "Pack 5 vidéos",
      price: "1,99€",
      qty: "5 vidéos",
      unitPrice: "0,40€ / vidéo",
      features: ["5 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine", "Export MP4 30 sec", "Musique de fond"],
      cta: "Choisir ce pack",
      color: "#4361ee",
      bg: "#EEF2FF",
      highlight: true,
      badge: "⭐ POPULAIRE",
    },
    {
      name: "Pack 10 vidéos",
      price: "3,49€",
      qty: "10 vidéos",
      unitPrice: "0,35€ / vidéo",
      features: ["10 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine", "Export MP4 30 sec", "Musique de fond"],
      cta: "Choisir ce pack",
      color: "#e63946",
      bg: "#FFF0F0",
    },
    {
      name: "Pack 20 vidéos",
      price: "5,99€",
      qty: "20 vidéos",
      unitPrice: "0,30€ / vidéo",
      features: ["20 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine premium", "Export MP4 30 sec", "Support prioritaire"],
      cta: "Choisir ce pack",
      color: "#9b59b6",
      bg: "#F8F0FF",
    },
  ];

  const plans = [
    {
      name: "Pack Starter",
      price: "1,80€",
      period: "/ 1 vidéo",
      features: ["1 BD complète", "Couverture + 4 pages", "Voix off humaine", "Export MP4 TikTok", "Musique de fond incluse"],
      cta: "Essayer maintenant",
      color: "#4361ee",
      bg: "#EEF2FF",
    },
    {
      name: "Pack Essentiel",
      price: "4,99€",
      period: "/ 3 vidéos",
      features: ["3 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine", "Export MP4 TikTok/Reels", "Musique de fond incluse"],
      cta: "Choisir ce pack",
      color: "#e63946",
      bg: "#FFF0F0",
    },
    {
      name: "Pack Famille",
      price: "9,99€",
      period: "/ 6 vidéos",
      features: ["6 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine premium", "Export MP4 TikTok/Reels", "Musique de fond incluse"],
      cta: "Choisir ce pack",
      color: "#e91e8c",
      bg: "#FFF0F8",
      highlight: true,
    },
    {
      name: "Pack Créateur",
      price: "14,99€",
      period: "/ 10 vidéos",
      features: ["10 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine premium", "Export MP4 TikTok/Reels/Shorts", "Musique de fond incluse"],
      cta: "Choisir ce pack",
      color: "#f4a261",
      bg: "#FFF8F0",
    },
    {
      name: "Pack Pro",
      price: "19,99€",
      period: "/ 15 vidéos",
      features: ["15 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine premium", "Export MP4 TikTok/Reels/Shorts", "Support prioritaire"],
      cta: "Choisir ce pack",
      color: "#27ae60",
      bg: "#F0FFF4",
    },
    {
      name: "Pack Studio",
      price: "29,99€",
      period: "/ 25 vidéos",
      features: ["25 BD complètes", "Couverture + 4 pages chacune", "Voix off humaine premium", "Export MP4 TikTok/Reels/Shorts", "Support prioritaire 24h"],
      cta: "Choisir ce pack",
      color: "#9b59b6",
      bg: "#F8F0FF",
    },
  ];

  return (
    <section id="tarifs" className="py-20" style={{ background: "#FFF8F0" }}>
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <div
            className="inline-block bg-blue-500 border-4 border-gray-900 rounded-2xl px-6 py-3 shadow-[5px_5px_0_#111] mb-4"
          >
            <h2
              className="text-3xl sm:text-4xl font-black text-white"
              style={{ fontFamily: "'Space Grotesk', sans-serif", textShadow: "2px 2px 0 #1d4ed8" }}
            >
              Tarifs simples
            </h2>
          </div>
          <p className="text-gray-700 font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Payez uniquement ce que vous créez.
          </p>
        </div>

        {/* ── PACKS 30 SECONDES — LE MOINS CHER ── */}
        <div className="mb-14">
          <div className="text-center mb-6">
            <div className="inline-block bg-green-500 border-4 border-gray-900 rounded-2xl px-5 py-2 shadow-[4px_4px_0_#111] mb-2">
              <h3 className="text-2xl sm:text-3xl font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ⏱️ Packs Vidéo 30 Secondes
              </h3>
            </div>
            <p className="text-gray-600 font-bold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Le format idéal pour TikTok & Reels — à partir de <span className="text-green-600 font-black text-lg">0,49€</span></p>
          </div>

          {/* Carte mise en avant : le moins cher */}
          <div className="bg-green-500 border-4 border-gray-900 rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0_#111] mb-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-block bg-yellow-400 border-2 border-gray-900 rounded-full px-3 py-1 text-xs font-black text-gray-900 mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                🔥 LE MOINS CHER — ESSAI GRATUIT
              </div>
              <h4 className="text-3xl sm:text-4xl font-black text-white mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                0,49€
                <span className="text-lg font-bold text-green-100 ml-2">/ 1 vidéo 30 sec</span>
              </h4>
              <p className="text-green-100 font-bold text-sm">1 BD complète • Couverture + 4 pages • Voix off • Export MP4</p>
            </div>
            <button
              className="text-gray-900 font-black px-8 py-4 rounded-xl border-4 border-gray-900 shadow-[5px_5px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-base whitespace-nowrap"
              style={{ background: "#FFD700", fontFamily: "'Space Grotesk', sans-serif" }}
              onClick={() => { const el = document.getElementById('generateur'); el?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              ✨ Essayer à 0,49€ !
            </button>
          </div>

          {/* Grille packs 30 sec */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packs30sec.map((pack, i) => (
              <div
                key={i}
                className={`border-4 border-gray-900 rounded-2xl p-5 shadow-[5px_5px_0_#111] ${
                  pack.highlight ? "ring-4 ring-green-400 scale-105" : ""
                }`}
                style={{ background: pack.bg }}
              >
                {pack.badge && (
                  <div className="text-center text-white text-xs font-black py-1 px-3 rounded-full border-2 border-gray-900 mb-3 inline-block" style={{ background: pack.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                    {pack.badge}
                  </div>
                )}
                <div className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: pack.color, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {pack.name}
                </div>
                <div className="mb-1">
                  <span className="text-3xl font-black text-gray-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{pack.price}</span>
                  <span className="text-xs text-gray-500 font-bold ml-1">/ {pack.qty}</span>
                </div>
                <div className="text-xs font-bold mb-3" style={{ color: pack.color }}>{pack.unitPrice}</div>
                <ul className="space-y-1 mb-4">
                  {pack.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                      <Check className="w-3 h-3 flex-shrink-0" style={{ color: pack.color }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  className="w-full text-white font-black py-2 rounded-xl border-3 border-gray-900 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[1px] hover:translate-y-[1px] transition-all text-sm"
                  style={{ background: pack.color, borderWidth: "3px", fontFamily: "'Space Grotesk', sans-serif" }}
                  onClick={() => { const el = document.getElementById('generateur'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                >
                  {pack.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── AUTRES PACKS ── */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gray-800 border-4 border-gray-900 rounded-2xl px-5 py-2 shadow-[4px_4px_0_#111]">
            <h3 className="text-xl font-black text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Autres packs</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`border-4 border-gray-900 rounded-2xl p-6 shadow-[6px_6px_0_#111] ${plan.highlight ? "scale-105" : ""}`}
              style={{ background: plan.bg }}
            >
              {plan.highlight && (
                <div
                  className="text-center text-white text-xs font-black py-1 px-3 rounded-full border-2 border-gray-900 mb-4 inline-block"
                  style={{ background: plan.color, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  ⭐ POPULAIRE
                </div>
              )}
              {('badge' in plan) && (plan as {badge?: string}).badge && (
                <div
                  className="text-center text-white text-xs font-black py-1 px-3 rounded-full border-2 border-gray-900 mb-4 inline-block"
                  style={{ background: plan.color, fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {(plan as {badge?: string}).badge}
                </div>
              )}
              <div
                className="text-xs font-black uppercase tracking-wider mb-3"
                style={{ color: plan.color, fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {plan.name}
              </div>
              <div className="mb-4">
                <span
                  className="text-4xl font-black text-gray-900"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-gray-500 font-bold ml-1">{plan.period}</span>
                )}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm font-bold text-gray-700">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: plan.color }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full font-black border-3 border-gray-900 shadow-[3px_3px_0_#111] hover:shadow-[1px_1px_0_#111] hover:translate-x-[2px] hover:translate-y-[2px] transition-all text-white rounded-xl"
                style={{
                  background: plan.color,
                  borderWidth: "3px",
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
                onClick={() => window.location.href = getLoginUrl()}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Final ─────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="py-20 bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div
          className="bg-yellow-400 border-4 border-white rounded-3xl p-10 shadow-[8px_8px_0_rgba(255,255,255,0.2)]"
        >
          <ComicTitle className="text-4xl sm:text-5xl mb-4">
            Prêt à devenir viral ?
          </ComicTitle>
          <div
            className="bg-white border-3 border-gray-900 rounded-2xl p-5 mb-6 shadow-[4px_4px_0_#111] text-left"
            style={{ borderWidth: "3px" }}
          >
            <p className="text-sm font-bold text-gray-700 italic leading-relaxed">
              "On entre un nom TikTok, l'IA analyse les vidéos, dessine les planches et génère une voix off. En 30 secondes, votre souvenir devient une œuvre d'art." 🎨
            </p>
            <p className="text-xs text-gray-400 font-bold mt-2">— Script TikTok de lancement SONIA.IA</p>
          </div>
          <a href="#generateur">
            <Button
              size="lg"
              className="text-white font-black px-10 py-4 rounded-xl border-4 border-gray-900 shadow-[5px_5px_0_#111] hover:shadow-[2px_2px_0_#111] hover:translate-x-[3px] hover:translate-y-[3px] transition-all text-base"
              style={{
                background: "linear-gradient(135deg, #e63946, #c0392b)",
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Créer ma première BD
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gray-950 border-t-4 border-gray-800 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #e63946, #FFD700)" }}
              >
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span
                className="text-xl font-black"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#e63946" }}
              >
                SONIA<span className="text-gray-400">.IA</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 font-medium leading-relaxed">
              Transformez vos souvenirs TikTok en bandes dessinées poétiques animées grâce à l'IA.
            </p>
          </div>

          <div>
            <h4 className="font-black text-white text-sm uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Navigation
            </h4>
            <ul className="space-y-2">
              {["Comment ça marche", "Galerie", "Tarifs", "À propos"].map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-gray-400 hover:text-white font-bold transition-colors">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-black text-white text-sm uppercase tracking-wider mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Suivre
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white font-bold transition-colors flex items-center gap-2">
                  <Music2 className="w-3 h-3" />
                  @lejtsonia sur TikTok
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-gray-400 hover:text-white font-bold transition-colors flex items-center gap-2">
                  <Camera className="w-3 h-3" />
                  @sonia.bd.ia
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-gray-500 font-medium">
            © 2026 SONIA.IA — BD & Mémoire. Tous droits réservés.
          </p>
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1">
            Fait avec <Heart className="w-3 h-3 text-red-500 fill-current" /> à Orléans, France
          </p>
        </div>
      </div>
    </footer>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <GeneratorSection />
      <HowItWorksSection />
      <BeforeAfterSection />
      <GallerySection />
      <AboutSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </div>
  );
}
