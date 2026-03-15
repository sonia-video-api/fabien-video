/**
 * Hook useVideoMontage — Montage vidéo MP4 TikTok 9:16
 * Appelle le backend FFmpeg pour assembler planches BD + voix off
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export function useVideoMontage() {
  const [isAssembling, setIsAssembling] = useState(false);
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [videoFilename, setVideoFilename] = useState<string>("");
  const [videoSize, setVideoSize] = useState<string>("");
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [assemblyProgress, setAssemblyProgress] = useState(0);

  const assembleMutation = trpc.video.assembleMontage.useMutation();
  const assembleDemoMutation = trpc.video.assembleDemoMontage.useMutation();
  const assemble60sMutation = trpc.video.assembleMontage60s.useMutation();

  /**
   * Assemble les images générées + voix off en MP4
   * @param imageUrls URLs des planches BD (DALL-E 3 ou statiques)
   * @param audioBase64 Audio MP3 en base64 (voix off OpenAI TTS)
   * @param title Titre de la BD
   */
  const assembleMontage = async (
    imageUrls: string[],
    audioBase64?: string,
    title?: string
  ) => {
    setIsAssembling(true);
    setVideoDataUrl(null);
    setAssemblyProgress(10);

    try {
      setAssemblyProgress(30);
      toast.info("🎬 Montage vidéo en cours...");

      const result = await assembleMutation.mutateAsync({
        imageUrls,
        audioBase64,
        title: title ?? "Ma BD SONIA.IA",
        durationPerImage: 5,
      });

      setAssemblyProgress(90);
      setVideoDataUrl(result.dataUrl);
      setVideoFilename(result.filename);
      setVideoSize(result.fileSizeMB);
      setVideoDuration(result.durationSeconds);
      setAssemblyProgress(100);

      toast.success(`🎉 Vidéo prête ! (${result.fileSizeMB} MB, ${result.durationSeconds}s)`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur montage : ${message}`);
      setAssemblyProgress(0);
    } finally {
      setIsAssembling(false);
    }
  };

  /**
   * Montage démo avec les images statiques du site
   */
  const assembleDemoMontage = async (audioBase64?: string) => {
    setIsAssembling(true);
    setVideoDataUrl(null);
    setAssemblyProgress(10);

    try {
      setAssemblyProgress(30);
      toast.info("🎬 Montage démo en cours...");

      const result = await assembleDemoMutation.mutateAsync({
        audioBase64,
        title: "Mon quotidien avec maman",
      });

      setAssemblyProgress(100);
      setVideoDataUrl(result.dataUrl);
      setVideoFilename(result.filename);
      setVideoSize(result.fileSizeMB);
      setVideoDuration(result.durationSeconds);

      toast.success(`🎉 Vidéo démo prête ! (${result.fileSizeMB} MB)`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur montage démo : ${message}`);
      setAssemblyProgress(0);
    } finally {
      setIsAssembling(false);
    }
  };

  /**
   * Assemble 5 segments de 12s chacun en une vidéo de 60 secondes
   * Chaque segment = 1 image + 1 voix off individuelle
   */
  // URL CDN de la musique bretonne (Tri Martolod synthétique, libre de droits)
  const BRETON_MUSIC_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/musique-bretonne-celtique_a9fecddb.mp3";

  const assembleMontage60s = async (
    segments: Array<{ imageUrl: string; audioBase64?: string; label?: string }>,
    title?: string,
    withMusic: boolean = true
  ) => {
    setIsAssembling(true);
    setVideoDataUrl(null);
    setAssemblyProgress(5);

    try {
      toast.info("🎥 Montage 60 secondes en cours... (peut prendre 1-2 min)");
      setAssemblyProgress(20);

      const result = await assemble60sMutation.mutateAsync({
        segments,
        title: title ?? "Ma BD SONIA.IA",
        segmentDuration: 12, // 5 segments × 12s = 60s
        backgroundMusicUrl: withMusic ? BRETON_MUSIC_URL : undefined,
        backgroundMusicVolume: 0.18, // 18% volume — fond discret derrière la voix off
      });

      setAssemblyProgress(95);
      setVideoDataUrl(result.dataUrl);
      setVideoFilename(result.filename);
      setVideoSize(result.fileSizeMB);
      setVideoDuration(result.durationSeconds);
      setAssemblyProgress(100);

      toast.success(`🎉 Vidéo 60s prête ! (${result.fileSizeMB} MB, ${result.durationSeconds}s)`);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      toast.error(`Erreur montage 60s : ${message}`);
      setAssemblyProgress(0);
    } finally {
      setIsAssembling(false);
    }
  };

  /**
   * Télécharge la vidéo MP4 générée
   */
  const downloadVideo = () => {
    if (!videoDataUrl) return;
    const a = document.createElement("a");
    a.href = videoDataUrl;
    a.download = videoFilename || "sonia_bd.mp4";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("📥 Téléchargement démarré !");
  };

  return {
    assembleMontage,
    assembleDemoMontage,
    assembleMontage60s,
    downloadVideo,
    isAssembling,
    videoDataUrl,
    videoFilename,
    videoSize,
    videoDuration,
    assemblyProgress,
  };
}
