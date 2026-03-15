/**
 * Hook useSonia — Appels aux routes backend SONIA.IA
 * Pipeline complet : TikTok → Scénario → 1 couverture + 4 pages + voix off par page
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface BDPage {
  page_number: number;
  scene_description: string;
  dialogue: string[];
  narration: string;
  voiceover?: string;
  timestamp: string;
}

export interface BDScenario {
  title: string;
  cover_description: string;
  cover_quote: string;
  cover_voiceover?: string;
  character_description?: string;
  pages: BDPage[];
  voiceover_text: string;
}

export interface TikTokProfile {
  username: string;
  nickname: string;
  avatar: string;
  avatarThumb?: string;
  signature: string;
  followerCount: number;
  followingCount?: number;
  videoCount: number;
  heartCount: number;
  isVerified?: boolean;
  videos: Array<{
    id: string;
    desc: string;
    coverUrl: string;
    playCount: number;
    diggCount: number;
    shareCount: number;
    webVideoUrl: string;
  }>;
  found: boolean;
  source?: string;
  error?: string;
  enrichedCharacterDescription?: string;
  enrichedLocation?: string;
}

// ── Résultat BD complet ───────────────────────────────────────────────────────
export interface BDResult {
  coverImage: string;
  coverAudio: string;      // dataUrl audio voix off couverture (résumé)
  pages: Array<{
    imageUrl: string;
    audioDataUrl: string;  // dataUrl audio voix off de cette page
    voiceoverText: string;
  }>;
}

// ── Hook principal ────────────────────────────────────────────
export function useSoniaGenerator() {
  const [scenario, setScenario] = useState<BDScenario | null>(null);
  const [tiktokProfile, setTiktokProfile] = useState<TikTokProfile | null>(null);
  // Rétrocompatibilité : voix off globale (couverture)
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  // Images : [couverture, page1, page2, page3, page4]
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  // Voix off par page : [coverAudio, page1Audio, page2Audio, page3Audio, page4Audio]
  const [pageAudios, setPageAudios] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");

  const fetchTikTokProfileMutation = trpc.sonia.fetchTikTokProfile.useMutation();
  const generateScenarioFromProfileMutation = trpc.sonia.generateScenarioFromProfile.useMutation();
  const searchAndGenerateBDMutation = trpc.sonia.searchAndGenerateBD.useMutation();
  const generateScenarioFromPhotoMutation = trpc.sonia.generateScenarioFromPhoto.useMutation();
  const generateVoiceoverMutation = trpc.sonia.generateVoiceover.useMutation();
  const generateBDImageMutation = trpc.sonia.generateBDImage.useMutation();

  /**
   * Pipeline complet : TikTok → Scénario → 1 couverture + 4 pages + voix off par page
   */
  const generateFullBD = async (username: string) => {
    setScenario(null);
    setTiktokProfile(null);
    setAudioDataUrl(null);
    setGeneratedImages([]);
    setPageAudios([]);
    setProgress(0);

    try {
      // ── Étape 1 : Récupérer le profil TikTok ──────────────────────────────
      setIsFetchingProfile(true);
      setCurrentStep("🔍 Analyse du profil TikTok @" + username + "...");
      setProgress(5);

      const profile = await fetchTikTokProfileMutation.mutateAsync({ username });
      setTiktokProfile(profile as TikTokProfile);
      setIsFetchingProfile(false);
      setProgress(15);

      if ((profile as TikTokProfile).found) {
        setCurrentStep(`✅ Profil trouvé : ${(profile as TikTokProfile).nickname} (${(profile as TikTokProfile).followerCount.toLocaleString()} abonnés)`);
        toast.info(`Profil @${username} trouvé — ${(profile as TikTokProfile).videoCount} vidéos`);
      } else {
        setCurrentStep("⚠️ Profil non trouvé, génération créative en cours...");
      }

      await new Promise(r => setTimeout(r, 300));

      // ── Étape 2 : Scénario enrichi avec bio + localisation ─────────────────
      setIsGeneratingScenario(true);
      setCurrentStep("🧠 Création du scénario BD (1 couverture + 4 pages)...");
      setProgress(22);

      const profileData = profile as TikTokProfile;
      const videosDescriptions = profileData.videos
        .filter(v => v.desc)
        .map(v => v.desc)
        .slice(0, 5);

      const scenarioResult = await generateScenarioFromProfileMutation.mutateAsync({
        username,
        nickname: profileData.nickname,
        signature: profileData.signature,
        followerCount: profileData.followerCount,
        heartCount: profileData.heartCount,
        videosDescriptions,
        avatarUrl: profileData.avatar,
        enrichedCharacterDescription: profileData.enrichedCharacterDescription,
        enrichedLocation: profileData.enrichedLocation,
      });

      const bd = scenarioResult as BDScenario;
      setScenario(bd);
      setProgress(35);
      setIsGeneratingScenario(false);
      setCurrentStep("✍️ Scénario créé : " + bd.title);

      await new Promise(r => setTimeout(r, 200));

      // ── Étape 3 : Voix off couverture (résumé de l'histoire) ───────────────
      setIsGeneratingVoice(true);
      setCurrentStep("🎙️ Voix off couverture (résumé)...");
      setProgress(40);

      const coverVoiceText = bd.cover_voiceover || bd.voiceover_text;
      const coverVoiceResult = await generateVoiceoverMutation.mutateAsync({
        text: coverVoiceText,
        voice: "nova",
      });
      setAudioDataUrl(coverVoiceResult.dataUrl);
      const audios: string[] = [coverVoiceResult.dataUrl];
      setPageAudios([...audios]);
      setProgress(45);

      // ── Étape 4 : Voix off pages 1 à 4 ───────────────────────────────────
      for (let i = 0; i < 4; i++) {
        const page = bd.pages[i];
        if (!page) continue;
        setCurrentStep(`🎙️ Voix off page ${i + 1}/4...`);
        const pageVoiceText = page.voiceover || page.narration || `Page ${i + 1} : ${page.scene_description.slice(0, 100)}`;
        const pageVoiceResult = await generateVoiceoverMutation.mutateAsync({
          text: pageVoiceText,
          voice: "nova",
        });
        audios.push(pageVoiceResult.dataUrl);
        setPageAudios([...audios]);
        setProgress(45 + (i + 1) * 3);
      }

      setIsGeneratingVoice(false);

      // ── Étape 5 : Couverture BD ────────────────────────────────────────────
      setIsGeneratingImages(true);
      setCurrentStep("🎨 Génération de la couverture BD...");
      setProgress(58);

      const characterCtx = bd.character_description ?? "";
      const coverResult = await generateBDImageMutation.mutateAsync({
        sceneDescription: `${bd.cover_description}. ${characterCtx}`,
        type: "cover",
        characterDescription: characterCtx,
      });

      setGeneratedImages([coverResult.imageUrl]);
      setProgress(65);

      // ── Étape 6 : Pages 1 à 4 ─────────────────────────────────────────────
      for (let i = 0; i < 4; i++) {
        const page = bd.pages[i];
        if (!page) continue;
        setCurrentStep(`🎨 Génération page ${i + 1}/4...`);
        const pageResult = await generateBDImageMutation.mutateAsync({
          sceneDescription: `${page.scene_description}. ${characterCtx}`,
          type: "page",
          characterDescription: characterCtx,
        });
        setGeneratedImages(prev => [...prev, pageResult.imageUrl]);
        setProgress(65 + (i + 1) * 8);
      }

      setProgress(100);
      setIsGeneratingImages(false);
      setCurrentStep("✅ Votre BD est prête ! 1 couverture + 4 pages + voix off");

      toast.success(`🎉 BD complète générée pour @${username} — "${bd.title}" !`);

    } catch (error: unknown) {
      setIsFetchingProfile(false);
      setIsGeneratingScenario(false);
      setIsGeneratingVoice(false);
      setIsGeneratingImages(false);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur : ${message}`);
      setCurrentStep("");
      setProgress(0);
    }
  };

  /**
   * Pipeline sujet libre : DuckDuckGo → Scénario → Images + Voix off
   */
  const generateBDFromTopic = async (topic: string) => {
    setScenario(null);
    setTiktokProfile(null);
    setAudioDataUrl(null);
    setGeneratedImages([]);
    setPageAudios([]);
    setProgress(0);

    try {
      // ── Étape 1 : Recherche DuckDuckGo + scénario ──────────────────────────
      setIsGeneratingScenario(true);
      setCurrentStep("🔍 Recherche automatique sur internet (DuckDuckGo)...");
      setProgress(10);

      const scenarioResult = await searchAndGenerateBDMutation.mutateAsync({ topic });
      const bd = scenarioResult as BDScenario & { searchContext?: string };
      setScenario(bd);
      setProgress(30);
      setIsGeneratingScenario(false);
      setCurrentStep("✍️ Scénario créé : " + bd.title);

      if (bd.searchContext) {
        toast.info(`🌐 ${bd.searchContext}`);
      }

      await new Promise(r => setTimeout(r, 200));

      // ── Étape 2 : Voix off couverture ──────────────────────────────────
      setIsGeneratingVoice(true);
      setCurrentStep("🎤 Voix off couverture...");
      setProgress(35);

      const coverVoiceText = bd.cover_voiceover || bd.voiceover_text;
      const coverVoiceResult = await generateVoiceoverMutation.mutateAsync({
        text: coverVoiceText,
        voice: "nova",
      });
      setAudioDataUrl(coverVoiceResult.dataUrl);
      const audios: string[] = [coverVoiceResult.dataUrl];
      setPageAudios([...audios]);
      setProgress(40);

      // ── Étape 3 : Voix off pages 1 à 4 ─────────────────────────────────
      for (let i = 0; i < 4; i++) {
        const page = bd.pages[i];
        if (!page) continue;
        setCurrentStep(`🎤 Voix off page ${i + 1}/4...`);
        const pageVoiceText = page.voiceover || page.narration || `Page ${i + 1} : ${page.scene_description.slice(0, 100)}`;
        const pageVoiceResult = await generateVoiceoverMutation.mutateAsync({
          text: pageVoiceText,
          voice: "nova",
        });
        audios.push(pageVoiceResult.dataUrl);
        setPageAudios([...audios]);
        setProgress(40 + (i + 1) * 4);
      }
      setIsGeneratingVoice(false);

      // ── Étape 4 : Couverture BD ───────────────────────────────────────
      setIsGeneratingImages(true);
      setCurrentStep("🎨 Génération de la couverture BD...");
      setProgress(58);

      const characterCtx = bd.character_description ?? "";
      const coverResult = await generateBDImageMutation.mutateAsync({
        sceneDescription: `${bd.cover_description}. ${characterCtx}`,
        type: "cover",
        characterDescription: characterCtx,
      });
      setGeneratedImages([coverResult.imageUrl]);
      setProgress(65);

      // ── Étape 5 : Pages 1 à 4 ──────────────────────────────────────────
      for (let i = 0; i < 4; i++) {
        const page = bd.pages[i];
        if (!page) continue;
        setCurrentStep(`🎨 Génération page ${i + 1}/4...`);
        const pageResult = await generateBDImageMutation.mutateAsync({
          sceneDescription: `${page.scene_description}. ${characterCtx}`,
          type: "page",
          characterDescription: characterCtx,
        });
        setGeneratedImages(prev => [...prev, pageResult.imageUrl]);
        setProgress(65 + (i + 1) * 8);
      }

      setProgress(100);
      setIsGeneratingImages(false);
      setCurrentStep("✅ Votre BD est prête ! 1 couverture + 4 pages + voix off");
      toast.success(`🎉 BD générée : "${bd.title}" !`);

    } catch (error: unknown) {
      setIsGeneratingScenario(false);
      setIsGeneratingVoice(false);
      setIsGeneratingImages(false);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur : ${message}`);
      setCurrentStep("");
      setProgress(0);
    }
  };

  /**
   * Pipeline photo : Upload photo → Analyse GPT-4 Vision → Scénario → Images + Voix off
   */
  const generateBDFromPhoto = async (imageBase64: string, mimeType: string) => {
    setScenario(null);
    setTiktokProfile(null);
    setAudioDataUrl(null);
    setGeneratedImages([]);
    setPageAudios([]);
    setProgress(0);

    try {
      // ── Étape 1 : Analyse de la photo avec GPT-4 Vision ─────────────────
      setIsGeneratingScenario(true);
      setCurrentStep("📸 Analyse de votre photo avec l'IA...");
      setProgress(10);

      const photoResult = await generateScenarioFromPhotoMutation.mutateAsync({ imageBase64, mimeType });
      const bd = photoResult.scenario as BDScenario;
      setScenario(bd);
      setProgress(30);
      setIsGeneratingScenario(false);
      setCurrentStep("✍️ Scénario créé : " + bd.title);

      await new Promise(r => setTimeout(r, 200));

      // ── Étape 2 : Voix off couverture ──────────────────────────────────
      setIsGeneratingVoice(true);
      setCurrentStep("🎤 Voix off couverture...");
      setProgress(35);

      const coverVoiceText = bd.cover_voiceover || bd.voiceover_text;
      const coverVoiceResult = await generateVoiceoverMutation.mutateAsync({
        text: coverVoiceText,
        voice: "nova",
      });
      setAudioDataUrl(coverVoiceResult.dataUrl);
      const audios: string[] = [coverVoiceResult.dataUrl];
      setPageAudios([...audios]);
      setProgress(40);

      // ── Étape 3 : Voix off pages 1 à 4 ─────────────────────────────────
      for (let i = 0; i < 4; i++) {
        const page = bd.pages[i];
        if (!page) continue;
        setCurrentStep(`🎤 Voix off page ${i + 1}/4...`);
        const pageVoiceText = page.voiceover || page.narration || `Page ${i + 1} : ${page.scene_description.slice(0, 100)}`;
        const pageVoiceResult = await generateVoiceoverMutation.mutateAsync({
          text: pageVoiceText,
          voice: "nova",
        });
        audios.push(pageVoiceResult.dataUrl);
        setPageAudios([...audios]);
        setProgress(40 + (i + 1) * 4);
      }
      setIsGeneratingVoice(false);

      // ── Étape 4 : Couverture BD ───────────────────────────────────────
      setIsGeneratingImages(true);
      setCurrentStep("🎨 Génération de la couverture BD...");
      setProgress(58);

      const characterCtx = (bd as BDScenario & { character_description?: string }).character_description ?? "";
      const coverResult = await generateBDImageMutation.mutateAsync({
        sceneDescription: `${bd.cover_description}. ${characterCtx}`,
        type: "cover",
        characterDescription: characterCtx,
      });
      setGeneratedImages([coverResult.imageUrl]);
      setProgress(65);

      // ── Étape 5 : Pages 1 à 4 ──────────────────────────────────────────
      for (let i = 0; i < 4; i++) {
        const page = bd.pages[i];
        if (!page) continue;
        setCurrentStep(`🎨 Génération page ${i + 1}/4...`);
        const pageResult = await generateBDImageMutation.mutateAsync({
          sceneDescription: `${page.scene_description}. ${characterCtx}`,
          type: "page",
          characterDescription: characterCtx,
        });
        setGeneratedImages(prev => [...prev, pageResult.imageUrl]);
        setProgress(65 + (i + 1) * 8);
      }

      setProgress(100);
      setIsGeneratingImages(false);
      setCurrentStep("✅ Votre BD est prête ! 1 couverture + 4 pages + voix off");
      toast.success(`🎉 BD générée à partir de votre photo : "${bd.title}" !`);

    } catch (error: unknown) {
      setIsGeneratingScenario(false);
      setIsGeneratingVoice(false);
      setIsGeneratingImages(false);
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur : ${message}`);
      setCurrentStep("");
      setProgress(0);
    }
  };

  const isLoading = isFetchingProfile || isGeneratingScenario || isGeneratingVoice || isGeneratingImages;

  return {
    generateFullBD,
    generateBDFromTopic,
    generateBDFromPhoto,
    scenario,
    tiktokProfile,
    audioDataUrl,
    generatedImages,
    pageAudios,
    isLoading,
    isFetchingProfile,
    isGeneratingScenario,
    isGeneratingVoice,
    isGeneratingImages,
    progress,
    currentStep,
  };
}

/**
 * Hook pour tester la validité de la clé API OpenAI
 */
export function useOpenAIStatus() {
  return trpc.sonia.testApiKey.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });
}
