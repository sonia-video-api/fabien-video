/**
 * SONIA.IA — Router Montage Vidéo
 * Assemble les planches BD + voix off en MP4 format 9:16 TikTok via FFmpeg
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import path from "path";
import os from "os";
import https from "https";
import http from "http";
import { execSync } from "child_process";

// ── Configuration FFmpeg ──────────────────────────────────────────────────────
// Utilise ffmpeg-static comme fallback si ffmpeg n'est pas dans le PATH système
try {
  execSync("ffmpeg -version", { stdio: "ignore" });
} catch {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require("ffmpeg-static") as string;
    if (ffmpegStatic) {
      ffmpeg.setFfmpegPath(ffmpegStatic);
      console.log("[FFmpeg] Using ffmpeg-static:", ffmpegStatic);
    }
  } catch {
    console.warn("[FFmpeg] ffmpeg-static not available either");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Télécharge une URL dans un fichier temporaire */
function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith("https") ? https : http;
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Suivre la redirection
        downloadFile(response.headers.location!, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

/** Sauvegarde un buffer base64 en fichier temporaire */
function saveBase64ToFile(base64: string, dest: string): void {
  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(dest, buffer);
}

/** Crée une image de titre avec FFmpeg (fond coloré + texte) */
function createTitleFrame(title: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Créer une image 1080x1920 (9:16) avec fond rouge et titre
    ffmpeg()
      .input("color=c=#e63946:size=1080x1920:rate=1")
      .inputOptions(["-f", "lavfi"])
      .outputOptions([
        "-vframes", "1",
        "-vf", `drawtext=text='${title.replace(/'/g, "\\'")}':fontsize=80:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=black@0.3:boxborderw=20`,
      ])
      .output(outputPath)
      .on("end", () => resolve())
      .on("error", (err) => reject(err))
      .run();
  });
}

// ── Router Vidéo ──────────────────────────────────────────────────────────────
export const videoRouter = router({

  /**
   * Assemble les planches BD + voix off en MP4 TikTok 9:16
   * Retourne le fichier MP4 en base64
   */
  assembleMontage: publicProcedure
    .input(
      z.object({
        imageUrls: z.array(z.string().url()).min(1).max(6),
        audioBase64: z.string().optional(),
        title: z.string().default("Ma BD SONIA.IA"),
        durationPerImage: z.number().min(2).max(15).default(5), // secondes par image
      })
    )
    .mutation(async ({ input }) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonia-"));

      try {
        // 1. Télécharger toutes les images
        const imagePaths: string[] = [];
        for (let i = 0; i < input.imageUrls.length; i++) {
          const imgPath = path.join(tmpDir, `image_${i}.jpg`);
          await downloadFile(input.imageUrls[i], imgPath);
          imagePaths.push(imgPath);
        }

        // 2. Sauvegarder la voix off si fournie
        let audioPath: string | null = null;
        if (input.audioBase64) {
          audioPath = path.join(tmpDir, "voiceover.mp3");
          saveBase64ToFile(input.audioBase64, audioPath);
        }

        // 3. Créer le fichier de liste d'images pour FFmpeg (slideshow)
        const listPath = path.join(tmpDir, "images.txt");
        const listContent = imagePaths
          .map((p) => `file '${p}'\nduration ${input.durationPerImage}`)
          .join("\n");
        // Ajouter la dernière image une fois de plus (requis par FFmpeg concat)
        const lastImg = imagePaths[imagePaths.length - 1];
        fs.writeFileSync(listPath, listContent + `\nfile '${lastImg}'`);

        // 4. Montage FFmpeg
        const outputPath = path.join(tmpDir, "sonia_bd.mp4");
        const totalDuration = imagePaths.length * input.durationPerImage;

        await new Promise<void>((resolve, reject) => {
          const cmd = ffmpeg();

          // Input slideshow d'images
          cmd
            .input(listPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .inputFPS(1 / input.durationPerImage);

          // Input audio si disponible
          if (audioPath) {
            cmd.input(audioPath);
          }

          cmd
            .outputOptions([
              "-c:v", "libx264",
              "-preset", "fast",
              "-crf", "23",
              "-pix_fmt", "yuv420p",
              // Format 9:16 TikTok : 1080x1920, scale + pad pour s'adapter
              "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
              "-r", "30",
              ...(audioPath ? ["-c:a", "aac", "-b:a", "128k", "-shortest"] : ["-an"]),
              "-t", String(totalDuration),
              "-movflags", "+faststart",
            ])
            .output(outputPath)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });

        // 5. Lire le fichier MP4 et le retourner en base64
        const videoBuffer = fs.readFileSync(outputPath);
        const videoBase64 = videoBuffer.toString("base64");
        const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);

        return {
          videoBase64,
          mimeType: "video/mp4",
          dataUrl: `data:video/mp4;base64,${videoBase64}`,
          durationSeconds: totalDuration,
          fileSizeMB,
          filename: `sonia_bd_${Date.now()}.mp4`,
        };

      } finally {
        // Nettoyage des fichiers temporaires
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignorer les erreurs de nettoyage
        }
      }
    }),

  /**
   * Version légère : montage avec images statiques (demo sans DALL-E)
   * Utilise les images CDN existantes du site
   */
  assembleDemoMontage: publicProcedure
    .input(
      z.object({
        audioBase64: z.string().optional(),
        title: z.string().default("Mon quotidien avec maman"),
      })
    )
    .mutation(async ({ input }) => {
      const demoImages = [
        "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-cover-manga-Bf2EBYke6WnHRNRpAf8dKs.webp",
        "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-page-bd-Zixzmih5FALWaPvxSQcFfw.webp",
        "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-cover-manga-Bf2EBYke6WnHRNRpAf8dKs.webp",
        "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/sonia-page-bd-Zixzmih5FALWaPvxSQcFfw.webp",
      ];

      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonia-demo-"));

      try {
        const imagePaths: string[] = [];
        for (let i = 0; i < demoImages.length; i++) {
          const imgPath = path.join(tmpDir, `image_${i}.jpg`);
          await downloadFile(demoImages[i], imgPath);
          imagePaths.push(imgPath);
        }

        let audioPath: string | null = null;
        if (input.audioBase64) {
          audioPath = path.join(tmpDir, "voiceover.mp3");
          saveBase64ToFile(input.audioBase64, audioPath);
        }

        const listPath = path.join(tmpDir, "images.txt");
        const durationPerImage = 5;
        const listContent = imagePaths
          .map((p) => `file '${p}'\nduration ${durationPerImage}`)
          .join("\n");
        fs.writeFileSync(listPath, listContent + `\nfile '${imagePaths[imagePaths.length - 1]}'`);

        const outputPath = path.join(tmpDir, "sonia_demo.mp4");
        const totalDuration = imagePaths.length * durationPerImage;

        await new Promise<void>((resolve, reject) => {
          const cmd = ffmpeg();
          cmd
            .input(listPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .inputFPS(1 / durationPerImage);

          if (audioPath) {
            cmd.input(audioPath);
          }

          cmd
            .outputOptions([
              "-c:v", "libx264",
              "-preset", "fast",
              "-crf", "23",
              "-pix_fmt", "yuv420p",
              "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
              "-r", "30",
              ...(audioPath ? ["-c:a", "aac", "-b:a", "128k", "-shortest"] : ["-an"]),
              "-t", String(totalDuration),
              "-movflags", "+faststart",
            ])
            .output(outputPath)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });

        const videoBuffer = fs.readFileSync(outputPath);
        const videoBase64 = videoBuffer.toString("base64");
        const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);

        return {
          videoBase64,
          mimeType: "video/mp4",
          dataUrl: `data:video/mp4;base64,${videoBase64}`,
          durationSeconds: totalDuration,
          fileSizeMB,
          filename: `sonia_demo_${Date.now()}.mp4`,
        };

      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignorer
        }
      }
    }),

  /**
   * Montage 60 secondes : 5 segments (couverture 12s + 4 pages 12s)
   * Chaque segment a sa propre voix off individuelle
   * Retourne un MP4 9:16 TikTok de 60 secondes
   */
  assembleMontage60s: publicProcedure
    .input(
      z.object({
        segments: z.array(
          z.object({
            imageUrl: z.string().url(),
            audioBase64: z.string().optional(),
            label: z.string().optional(),
          })
        ).min(1).max(6),
        title: z.string().default("Ma BD SONIA.IA"),
        segmentDuration: z.number().min(5).max(20).default(12),
        backgroundMusicUrl: z.string().url().optional(),
        backgroundMusicVolume: z.number().min(0).max(1).default(0.18),
      })
    )
    .mutation(async ({ input }) => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "sonia-60s-"));
      try {
        const { segments, title, segmentDuration, backgroundMusicUrl, backgroundMusicVolume } = input;
        const segmentPaths: string[] = [];

        // Générer chaque segment individuellement
        for (let i = 0; i < segments.length; i++) {
          const seg = segments[i];
          const segDir = path.join(tmpDir, `seg_${i}`);
          fs.mkdirSync(segDir);

          const imgPath = path.join(segDir, "image.jpg");
          await downloadFile(seg.imageUrl, imgPath);

          let audioPath: string | null = null;
          if (seg.audioBase64) {
            audioPath = path.join(segDir, "audio.mp3");
            saveBase64ToFile(seg.audioBase64, audioPath);
          }

          const segOutputPath = path.join(segDir, "segment.mp4");
          await new Promise<void>((resolve, reject) => {
            const cmd = ffmpeg();
            cmd
              .input(imgPath)
              .inputOptions(["-loop", "1", "-t", String(segmentDuration)])
              .inputFPS(30);

            if (audioPath) {
              cmd.input(audioPath);
            }

            cmd
              .outputOptions([
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-pix_fmt", "yuv420p",
                "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
                "-r", "30",
                "-t", String(segmentDuration),
                ...(audioPath
                  ? ["-c:a", "aac", "-b:a", "128k", "-shortest"]
                  : ["-an"]
                ),
                "-movflags", "+faststart",
              ])
              .output(segOutputPath)
              .on("end", () => resolve())
              .on("error", (err: Error) => reject(err))
              .run();
          });

          segmentPaths.push(segOutputPath);
        }

        // Concaténer tous les segments
        const concatListPath = path.join(tmpDir, "concat.txt");
        const concatContent = segmentPaths.map((p) => `file '${p}'`).join("\n");
        fs.writeFileSync(concatListPath, concatContent);

        const totalDuration = segments.length * segmentDuration;

        // Étape 1 : concaténer les segments vidéo
        const concatOutputPath = path.join(tmpDir, "sonia_concat.mp4");
        await new Promise<void>((resolve, reject) => {
          ffmpeg()
            .input(concatListPath)
            .inputOptions(["-f", "concat", "-safe", "0"])
            .outputOptions(["-c", "copy", "-movflags", "+faststart"])
            .output(concatOutputPath)
            .on("end", () => resolve())
            .on("error", (err: Error) => reject(err))
            .run();
        });

        const outputPath = path.join(tmpDir, "sonia_60s.mp4");

        // Étape 2 : mixer avec la musique de fond si fournie
        if (backgroundMusicUrl) {
          const bgMusicPath = path.join(tmpDir, "bg_music.mp3");
          await downloadFile(backgroundMusicUrl, bgMusicPath);

          await new Promise<void>((resolve, reject) => {
            const vol = backgroundMusicVolume ?? 0.18;
            ffmpeg()
              .input(concatOutputPath)
              .input(bgMusicPath)
              .inputOptions(["-stream_loop", "-1"]) // boucle la musique si trop courte
              .complexFilter([
                // Extraire l'audio de la vidéo (voix off) et le mixer avec la musique de fond
                `[0:a]volume=1.0[voix]`,
                `[1:a]volume=${vol},atrim=0:${totalDuration}[bg]`,
                `[voix][bg]amix=inputs=2:duration=first:normalize=0[audio_final]`
              ])
              .outputOptions([
                "-map", "0:v",
                "-map", "[audio_final]",
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "128k",
                "-t", String(totalDuration),
                "-movflags", "+faststart",
              ])
              .output(outputPath)
              .on("end", () => resolve())
              .on("error", (err: Error) => reject(err))
              .run();
          });
        } else {
          // Pas de musique de fond — utiliser la concaténation directe
          fs.copyFileSync(concatOutputPath, outputPath);
        }

        const videoBuffer = fs.readFileSync(outputPath);
        const videoBase64 = videoBuffer.toString("base64");
        const fileSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);

        return {
          videoBase64,
          mimeType: "video/mp4",
          dataUrl: `data:video/mp4;base64,${videoBase64}`,
          durationSeconds: totalDuration,
          fileSizeMB,
          filename: `sonia_bd_${Date.now()}.mp4`,
          segmentCount: segments.length,
          title,
        };

      } finally {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
          // Ignorer
        }
      }
    }),
});
