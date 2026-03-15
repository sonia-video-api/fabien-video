/**
 * SONIA.IA — Router backend
 * Routes : TikTok profil (FastAPI scraper), scénario (Gemini/GPT-4o), images BD (Manus generateImage), TTS voix off
 */
import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";
import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";

// ── Helpers OpenAI (TTS uniquement) ──────────────────────────────────────────
const OPENAI_BASE = "https://api.openai.com/v1";
function openaiHeaders() {
  if (!ENV.openaiApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Clé API OpenAI non configurée.",
    });
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ENV.openaiApiKey}`,
  };
}

// ── URL de l'API FastAPI TikTok (scraper local) ───────────────────────────────
const TIKTOK_API_BASE = "http://localhost:8001";

// ── Profils enrichis : description précise basée sur la vraie photo ────────────
// Ces descriptions sont générées manuellement à partir des vraies photos de profil
const ENRICHED_PROFILES: Record<string, {
  characterDescription: string;
  avatarCdnUrl: string;
  thematic: string;
  location: string;
  realVideos?: string[];
}> = {
  "cyrilledorveaux76": {
    characterDescription: "A French man in his late 40s to early 50s with short salt-and-pepper hair (mostly dark with grey streaks), light stubble beard, and a slightly stocky build. He wears distinctive red-framed rectangular glasses. He is wearing a dark blue/grey quilted puffer vest over a dark shirt. He has a warm, slightly serious expression with rosy cheeks. Background shows a bar/restaurant setting with bottles on shelves.",
    avatarCdnUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310519663120318294/fA86Sa2wEfvDjntrs2uEtF/cyrille-avatar_25d95d0c.jpeg",
    thematic: "cuisine bretonne, recettes de Paimpol, vie de chef cuisinier en Bretagne",
    location: "Paimpol, Bretagne, France",
    realVideos: [
      "Recettes bretonnes et idées de pique-nique à Ploubazlanec — galettes, crêpes, fruits de mer",
      "Cuisson du barbu : recette bretonne avec poisson, miel, recette maison",
      "Galette bretonne et crêpes traditionnelles bretonnes — cuisine du terroir",
      "Mini tacos panés hyper gourmand et facile à faire — recette économique",
      "Moments drôles avec Cyrille Dorveaux à Paimpol — humour breton",
      "Découverte de Paimpol et terrasse de Bréhat — vie en Bretagne",
      "Plat savoureux préparé en Bretagne — cuisine locale et authentique",
    ],
  },
  "lejtsonia": {
    characterDescription: "A cheerful French woman in her 30s with long dark hair, warm brown eyes, and an expressive smile. She wears colorful casual clothes. She is often shown with an elderly woman (her mother) who has white hair and a kind face.",
    avatarCdnUrl: "",
    thematic: "vie quotidienne avec maman, humour familial, moments tendres mère-fille",
    location: "France",
  },
};

// ── Router SONIA ──────────────────────────────────────────────────────────────
export const soniaRouter = router({

  /**
   * Récupère le profil TikTok via l'API FastAPI scraper (port 8001)
   * Retourne avatar HD, nom, stats et bio
   */
  fetchTikTokProfile: publicProcedure
    .input(
      z.object({
        username: z.string().min(1).max(50),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // 1. Récupérer le profil via FastAPI scraper
        const profileRes = await fetch(`${TIKTOK_API_BASE}/api/v1/users/${encodeURIComponent(input.username)}`, {
          signal: AbortSignal.timeout(25000),
        });

        if (!profileRes.ok) {
          throw new Error(`FastAPI scraper error: ${profileRes.status}`);
        }

        const profile = await profileRes.json() as {
          username: string;
          display_name: string;
          bio_description: string | null;
          avatar_url: string;
          avatar_large_url: string | null;
          is_verified: boolean;
          follower_count: number;
          following_count: number;
          likes_count: number;
          video_count: number;
          profile_url: string;
        };

        // 2. Récupérer les vidéos (optionnel, peut être vide)
        let videos: Array<{
          id: string;
          desc: string;
          coverUrl: string;
          playCount: number;
          diggCount: number;
          shareCount: number;
          webVideoUrl: string;
        }> = [];

        try {
          const videosRes = await fetch(`${TIKTOK_API_BASE}/api/v1/users/${encodeURIComponent(input.username)}/videos?max_count=6`, {
            signal: AbortSignal.timeout(20000),
          });
          if (videosRes.ok) {
            const videosData = await videosRes.json() as Array<{
              video_id: string;
              description: string;
              cover_url: string;
              like_count: number;
              comment_count: number;
              share_count: number;
              view_count: number;
            }>;
            videos = videosData.map(v => ({
              id: v.video_id,
              desc: v.description,
              coverUrl: v.cover_url,
              playCount: v.view_count,
              diggCount: v.like_count,
              shareCount: v.share_count,
              webVideoUrl: `https://www.tiktok.com/@${input.username}/video/${v.video_id}`,
            }));
          }
        } catch {
          // Vidéos non disponibles, on continue avec le profil seul
        }

        // Utiliser le profil enrichi si disponible (vraie photo CDN + description précise)
        const enriched = ENRICHED_PROFILES[input.username.toLowerCase()];
        const avatarUrl = enriched?.avatarCdnUrl || profile.avatar_large_url || profile.avatar_url;

        // Si les vidéos scrappées sont vides mais qu'on a des vidéos enrichies, les utiliser
        const finalVideos = videos.length > 0 ? videos : (enriched?.realVideos ?? []).map((desc, i) => ({
          id: `enriched-${i}`,
          desc,
          coverUrl: "",
          playCount: 0,
          diggCount: 0,
          shareCount: 0,
          webVideoUrl: `https://www.tiktok.com/@${input.username}`,
        }));

        return {
          username: profile.username,
          nickname: profile.display_name,
          avatar: avatarUrl,
          avatarThumb: profile.avatar_url,
          signature: profile.bio_description || (enriched?.thematic ?? ""),
          followerCount: profile.follower_count,
          followingCount: profile.following_count,
          videoCount: profile.video_count,
          heartCount: profile.likes_count,
          isVerified: profile.is_verified,
          videos: finalVideos,
          found: true,
          source: enriched ? "enriched-profile" : "fastapi-scraper",
          enrichedCharacterDescription: enriched?.characterDescription,
          enrichedLocation: enriched?.location,
        };

      } catch (e) {
        // Fallback vers l'API Manus Data
        try {
          const userInfo = await callDataApi("Tiktok/get_user_info", {
            query: { uniqueId: input.username },
          }) as Record<string, unknown>;

          const userInfoData = userInfo as Record<string, Record<string, Record<string, unknown>>>;
          const user = userInfoData?.userInfo?.user ?? {};
          const stats = userInfoData?.userInfo?.stats ?? {};

          return {
            username: input.username,
            nickname: String(user.nickname ?? input.username),
            avatar: String(user.avatarMedium ?? user.avatarThumb ?? ""),
            avatarThumb: String(user.avatarThumb ?? ""),
            signature: String(user.signature ?? ""),
            followerCount: Number(stats.followerCount ?? 0),
            followingCount: Number(stats.followingCount ?? 0),
            videoCount: Number(stats.videoCount ?? 0),
            heartCount: Number(stats.heartCount ?? 0),
            isVerified: Boolean(user.verified ?? false),
            videos: [],
            found: true,
            source: "manus-data-api",
          };
        } catch {
          return {
            username: input.username,
            nickname: input.username,
            avatar: "",
            avatarThumb: "",
            signature: "",
            followerCount: 0,
            followingCount: 0,
            videoCount: 0,
            heartCount: 0,
            isVerified: false,
            videos: [],
            found: false,
            error: String(e),
            source: "error",
          };
        }
      }
    }),

  /**
   * Génère un scénario BD à partir d'un profil TikTok
   * Utilise Gemini 2.5 Flash (invokeLLM)
   */
  generateScenario: publicProcedure
    .input(
      z.object({
        username: z.string().min(1).max(50),
        theme: z.string().optional().default("famille et quotidien"),
      })
    )
    .mutation(async ({ input }) => {
      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Tu es un scénariste de bandes dessinées expert. Réponds uniquement en JSON valide, sans markdown ni backticks.",
          },
          {
            role: "user",
            content: `Tu es un scénariste de bandes dessinées spécialisé dans les histoires familiales touchantes et humoristiques, dans le style de @lejtsonia sur TikTok.

Crée un scénario de BD en 4 planches pour le profil TikTok @${input.username} sur le thème : "${input.theme}".

Format de réponse JSON strict :
{
  "title": "Titre de la BD",
  "cover_description": "Description visuelle de la couverture",
  "cover_quote": "Phrase accroche de la couverture",
  "pages": [
    {"page_number": 1, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "timestamp": "0:00"},
    {"page_number": 2, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "timestamp": "0:18"},
    {"page_number": 3, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "timestamp": "0:33"},
    {"page_number": 4, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "timestamp": "0:47"}
  ],
  "voiceover_text": "Texte complet de la voix off (60-80 mots, ton doux et poétique)"
}

Style : chaleureux, humour doux, émotions vraies. Personnages : une femme et sa maman. Décors : maison, plage, jardin, quotidien.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1500,
      });

      const content = result.choices[0]?.message?.content ?? "{}";
      try {
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible de parser la réponse LLM" });
      }
    }),

  /**
   * Génère une voix off avec OpenAI TTS
   */
  generateVoiceover: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(4096),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
      })
    )
    .mutation(async ({ input }) => {
      const response = await fetch(`${OPENAI_BASE}/audio/speech`, {
        method: "POST",
        headers: openaiHeaders(),
        body: JSON.stringify({
          model: "tts-1",
          input: input.text,
          voice: input.voice,
          response_format: "mp3",
          speed: 0.9,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `OpenAI TTS error: ${err}` });
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      return {
        audioBase64: base64,
        mimeType: "audio/mpeg",
        dataUrl: `data:audio/mpeg;base64,${base64}`,
      };
    }),

  /**
   * Génère une illustration BD avec le service Manus generateImage
   * Prompts ultra-détaillés pour qualité manga shojo professionnelle
   */
  generateBDImage: publicProcedure
    .input(
      z.object({
        sceneDescription: z.string().min(1).max(800),
        style: z.string().optional().default("manga shojo coloré"),
        type: z.enum(["cover", "page"]).default("page"),
        characterDescription: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
       const characterBase = input.characterDescription
        ? input.characterDescription
        : "a cheerful French person with warm smile, wearing casual everyday clothes (t-shirt and jeans), friendly appearance";

      // Règles anti-nudité strictes injectées dans tous les prompts
      const SAFETY_RULES = `STRICT RULES: ALL characters must be FULLY CLOTHED at all times. No nudity, no revealing clothing, no underwear visible. Characters wear their actual described outfits. Safe for all ages, family-friendly content only.`;

      let fullPrompt: string;

      if (input.type === "cover") {
        fullPrompt = `PROFESSIONAL MANGA COMIC BOOK COVER — ultra high quality digital art, publishable quality.

STYLE: Modern French shojo manga with warm watercolor textures and clean ink linework. Vibrant, eye-catching, cinematic.

MAIN CHARACTER: ${characterBase}. The character is centered, looking warmly at the viewer with a big expressive smile, FULLY CLOTHED in their described outfit. Large expressive manga eyes, detailed hair, dynamic pose.

TITLE DESIGN (MOST IMPORTANT ELEMENT):
- A SPECTACULAR 3D title text at the TOP of the cover
- Letters are HUGE, bold, with thick white outline and deep red drop shadow
- 3D effect: letters appear to pop out of the page with depth and perspective
- The title text glows with golden-yellow color and has a comic book halftone texture
- Style similar to classic Shonen Jump manga titles — dramatic, impactful, eye-catching
- The title banner has a bright red/yellow gradient background with black border

LAYOUT:
- Top 25%: Spectacular 3D title banner (red/yellow gradient, bold white-outlined letters)
- Center 50%: Main character full body, expressive, dynamic
- Bottom 25%: 3 small comic panels showing daily life scenes (family, kitchen, beach)
- Decorative elements: stars, sparkles, speed lines, halftone dots

COLOR PALETTE: Warm oranges, deep crimson reds, golden yellows, soft lavender, cream whites. High contrast, vibrant.

ATMOSPHERE: Like a real published French manga album cover — professional, polished, exciting.

SCENE CONTEXT: ${input.sceneDescription}

${SAFETY_RULES}

QUALITY: Ultra detailed, professional manga artist, vibrant colors, publishable quality. The 3D title must be clearly visible and spectacular.`;
      } else {
        fullPrompt = `Professional manga shojo comic book interior page, ultra high quality digital illustration. Style: modern French shojo manga with warm watercolor textures.

Layout: 3 comic panels arranged vertically (tall format). Each panel has thick black borders with rounded corners.

Main character: ${characterBase}, FULLY CLOTHED in their described outfit throughout all panels.
Secondary character: an elderly family member (white hair, kind face, wearing colorful everyday clothes, FULLY CLOTHED).

Panel 1: establishing shot showing the scene, both characters fully dressed
Panel 2: close-up on characters' expressions (large expressive manga eyes), showing their faces and upper body with clothes
Panel 3: emotional moment with speech bubbles in French, characters in their full outfits

Decorative elements: small stars, hearts, and sparkles between panels. Panel borders with slight drop shadow.

Color palette: warm pastels, soft watercolor washes, cream backgrounds. Clean manga linework with soft shading.

Scene context: ${input.sceneDescription}

${SAFETY_RULES}

Quality: ultra detailed, professional manga artist, vibrant colors, publishable quality.`;
      }

      try {
        const result = await generateImage({ prompt: fullPrompt });
        return {
          imageUrl: result.url ?? "",
          revisedPrompt: fullPrompt,
        };
      } catch (e) {
        // Fallback vers OpenAI DALL-E 3 direct si le service Manus échoue
        const response = await fetch(`${OPENAI_BASE}/images/generations`, {
          method: "POST",
          headers: openaiHeaders(),
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: fullPrompt,
            n: 1,
            size: "1024x1792",
            quality: "hd",
            style: "vivid",
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Image generation error: ${err}` });
        }

        const data = await response.json() as { data: Array<{ url: string; revised_prompt?: string }> };
        return {
          imageUrl: data.data[0]?.url ?? "",
          revisedPrompt: data.data[0]?.revised_prompt ?? fullPrompt,
        };
      }
    }),

  /**
   * Pipeline complet : TikTok → Scénario Gemini → Analyse visuelle → Prompt image
   */
  generateScenarioFromProfile: publicProcedure
    .input(
      z.object({
        username: z.string().min(1).max(50),
        nickname: z.string().optional(),
        signature: z.string().optional(),
        followerCount: z.number().optional(),
        heartCount: z.number().optional(),
        videosDescriptions: z.array(z.string()).optional(),
        avatarUrl: z.string().optional(),
        enrichedCharacterDescription: z.string().optional(),
        enrichedLocation: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const videosContext = input.videosDescriptions && input.videosDescriptions.length > 0
        ? `\n\nVidéos populaires du profil :\n${input.videosDescriptions.slice(0, 5).map((d, i) => `${i + 1}. ${d}`).join("\n")}`
        : "";

      // Contexte du profil réel (bio, stats)
      const bioContext = input.signature && input.signature.trim()
        ? `\n\nBio TikTok du profil : "${input.signature.trim()}"`
        : "";
      const statsContext = input.followerCount && input.followerCount > 0
        ? `\nStats : ${input.followerCount.toLocaleString("fr-FR")} abonnés, ${(input.heartCount ?? 0).toLocaleString("fr-FR")} likes`
        : "";

      // Utiliser la description enrichie si disponible (plus précise que l'analyse vision)
      let characterDescription = input.enrichedCharacterDescription ?? "";
      const locationContext = input.enrichedLocation
        ? `\n\nLieu de vie : ${input.enrichedLocation}`
        : "";

      // Analyse visuelle de l'avatar seulement si pas de description enrichie
      if (!characterDescription && input.avatarUrl && input.avatarUrl.length > 0) {
        try {
          const visionResult = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "You are a character description expert for comic book illustration. Describe people accurately and respectfully. Always mention their clothing explicitly.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: { url: input.avatarUrl, detail: "high" },
                  },
                  {
                    type: "text",
                    text: `Describe the main person visible in this profile photo for a manga comic book illustration. Be very specific and accurate. Include:
1. Gender (man/woman)
2. Approximate age (20s/30s/40s/50s+)
3. Body type and build
4. Hair color, length and style
5. Skin tone
6. EXACT clothing they are wearing (color, type, style)
7. Any distinctive features (glasses, beard, accessories)

Format: Write 2-3 sentences in English. ALWAYS mention the clothing. Example: "A middle-aged French man in his 40s with short dark hair and a warm smile, wearing a white chef's apron over a blue t-shirt. He has a stocky build, light skin, and appears friendly and approachable."

IMPORTANT: The character must be described as FULLY CLOTHED in their actual outfit.`,
                  },
                ],
              },
            ],
            max_tokens: 300,
          });
          const visionContent = visionResult.choices[0]?.message?.content;
          characterDescription = typeof visionContent === "string" ? visionContent : "";
        } catch {
          characterDescription = `a cheerful French person with warm smile, fully clothed in casual everyday clothes, friendly appearance`;
        }
      }

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Tu es un scénariste BD expert. Réponds uniquement en JSON valide, sans markdown ni backticks.",
          },
          {
            role: "user",
            content: `Tu es un scénariste de bandes dessinées spécialisé dans les histoires familiales touchantes et humoristiques, dans le style de @lejtsonia sur TikTok.

Crée un scénario de BD en 4 planches pour le profil TikTok @${input.username} (nom : ${input.nickname ?? input.username}).${bioContext}${statsContext}${locationContext}${videosContext}

IMPORTANT : Le scénario DOIT être basé sur la vraie thématique du profil telle qu'indiquée dans la bio. Si la bio mentionne la cuisine, le scénario parle de cuisine. Si elle mentionne la famille, le scénario parle de famille. Ne pas inventer une thématique différente.

Format de réponse JSON strict :
{
  "title": "Titre de la BD",
  "cover_description": "Description visuelle de la couverture",
  "cover_quote": "Phrase accroche de la couverture (1 ligne percutante)",
  "cover_voiceover": "Voix off de la couverture : résumé de l'histoire en 2-3 phrases, ton chaleureux et invitant, 25-35 mots",
  "character_description": "${characterDescription || "Description du personnage principal pour DALL-E"}",
  "pages": [
    {"page_number": 1, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 1 : 15-20 mots, ton poétique", "timestamp": "0:00"},
    {"page_number": 2, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 2 : 15-20 mots, ton poétique", "timestamp": "0:18"},
    {"page_number": 3, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 3 : 15-20 mots, ton poétique", "timestamp": "0:33"},
    {"page_number": 4, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 4 : 15-20 mots, ton émouvant et conclusif", "timestamp": "0:47"}
  ],
  "voiceover_text": "Texte complet de la voix off (toutes pages concaténées, 60-80 mots)"
}

Style : chaleureux, humour doux, émotions vraies.
Personnages : adaptés au profil réel (si c'est un homme, le personnage principal est un homme ; si c'est une femme, c'est une femme).
Décors : adaptés à la thématique du profil (cuisine, famille, quotidien, etc.).
IMPORTANT : Les personnages sont toujours habillés normalement dans leurs tenues quotidiennes.

RÈGLES D'ORTHOGRAPHE STRICTES :
- Tous les textes (titre, dialogues, narrations, voix off) doivent être en français parfait, sans aucune faute d'orthographe.
- Les accents sont obligatoires : é, è, ê, à, â, ô, û, î, ï, ç, œ, etc.
- Les dialogues doivent être naturels et corrects grammaticalement.
- Aucun mot inventé ou déformé n'est accepté.
- Vérifie chaque mot avant de l'écrire.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = result.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        // Injecter la description du personnage si elle n'est pas dans le JSON
        if (characterDescription && !parsed.character_description) {
          parsed.character_description = characterDescription;
        }
        return parsed;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible de parser la réponse LLM" });
      }
    }),

  /**
   * Recherche automatique DuckDuckGo + génération BD sur n'importe quel sujet
   * Le client tape un sujet libre → l'IA cherche sur internet → génère la BD
   */
  searchAndGenerateBD: publicProcedure
    .input(
      z.object({
        topic: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ input }) => {
      // ── Étape 1 : Recherche DuckDuckGo ────────────────────────────────────
      let searchResults = "";
      try {
        // DuckDuckGo Instant Answer API (gratuit, sans clé)
        const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(input.topic)}&format=json&no_html=1&skip_disambig=1`;
        const ddgRes = await fetch(ddgUrl, {
          headers: { "User-Agent": "SONIA.IA/1.0" },
          signal: AbortSignal.timeout(10000),
        });
        if (ddgRes.ok) {
          const ddgData = await ddgRes.json() as {
            AbstractText?: string;
            AbstractSource?: string;
            RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
            Answer?: string;
            Definition?: string;
          };
          const parts: string[] = [];
          if (ddgData.Answer) parts.push(`Réponse directe: ${ddgData.Answer}`);
          if (ddgData.AbstractText) parts.push(`Résumé: ${ddgData.AbstractText}`);
          if (ddgData.Definition) parts.push(`Définition: ${ddgData.Definition}`);
          if (ddgData.RelatedTopics && ddgData.RelatedTopics.length > 0) {
            const topics = ddgData.RelatedTopics
              .filter(t => t.Text)
              .slice(0, 5)
              .map(t => `- ${t.Text}`);
            if (topics.length > 0) parts.push(`Sujets liés:\n${topics.join("\n")}`);
          }
          searchResults = parts.join("\n\n");
        }
      } catch {
        // Fallback : continuer sans résultats de recherche
      }

      // ── Étape 2 : Recherche web complémentaire via DuckDuckGo HTML ────────
      if (!searchResults || searchResults.length < 100) {
        try {
          const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(input.topic)}`;
          const htmlRes = await fetch(htmlUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; SONIA.IA/1.0)",
              "Accept": "text/html",
            },
            signal: AbortSignal.timeout(12000),
          });
          if (htmlRes.ok) {
            const html = await htmlRes.text();
            // Extraire les snippets de résultats (texte entre balises)
            const snippets: string[] = [];
            const snippetRegex = /<a class="result__snippet"[^>]*>([^<]+(?:<b>[^<]+<\/b>[^<]*)*)<\/a>/gi;
            let match;
            while ((match = snippetRegex.exec(html)) !== null && snippets.length < 5) {
              const text = match[1].replace(/<[^>]+>/g, "").trim();
              if (text.length > 20) snippets.push(text);
            }
            if (snippets.length > 0) {
              searchResults = (searchResults ? searchResults + "\n\n" : "") +
                `Résultats web:\n${snippets.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
            }
          }
        } catch {
          // Continuer sans résultats web
        }
      }

      // ── Étape 3 : Générer le scénario BD basé sur les infos trouvées ──────
      const contextInfo = searchResults
        ? `\n\nInformations trouvées sur internet :\n${searchResults}`
        : "\n\n(Aucune information supplémentaire trouvée — génération créative basée sur le sujet)";

      const result = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Tu es un scénariste BD expert. Réponds uniquement en JSON valide, sans markdown ni backticks.",
          },
          {
            role: "user",
            content: `Tu es un scénariste de bandes dessinées qui transforme des sujets d'actualité ou des thèmes libres en BD illustrées.

Sujet demandé par l'utilisateur : "${input.topic}"${contextInfo}

Crée un scénario de BD en 4 planches sur ce sujet. La BD doit être informative, accessible et visuellement intéressante.

Format de réponse JSON strict :
{
  "title": "Titre de la BD",
  "cover_description": "Description visuelle de la couverture (scène principale du sujet)",
  "cover_quote": "Phrase accroche percutante sur le sujet",
  "cover_voiceover": "Voix off de la couverture : introduction du sujet en 2-3 phrases, 25-35 mots",
  "character_description": "Description des personnages ou éléments visuels principaux",
  "pages": [
    {"page_number": 1, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 1 : 15-20 mots", "timestamp": "0:00"},
    {"page_number": 2, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 2 : 15-20 mots", "timestamp": "0:18"},
    {"page_number": 3, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 3 : 15-20 mots", "timestamp": "0:33"},
    {"page_number": 4, "scene_description": "...", "dialogue": ["...", "..."], "narration": "...", "voiceover": "Voix off page 4 : 15-20 mots, conclusif", "timestamp": "0:47"}
  ],
  "voiceover_text": "Texte complet de la voix off (60-80 mots)",
  "search_context": "${searchResults ? "Basé sur des informations trouvées sur internet" : "Génération créative"}"
}

Style : informatif, accessible, visuellement dynamique. Personnages adaptés au sujet.
RÈGLES STRICTES : Tous les textes en français parfait avec accents. Personnages toujours habillés normalement.`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const content = result.choices[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        parsed.searchContext = searchResults
          ? `Informations trouvées sur internet (DuckDuckGo)`
          : "Génération créative (aucune info trouvée)";
        return parsed;
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible de parser la réponse LLM" });
      }
    }),

  /**
   * Génère un scénario BD à partir d'une photo uploadée (analyse GPT-4 Vision)
   */
  generateScenarioFromPhoto: publicProcedure
    .input(
      z.object({
        imageBase64: z.string().min(1),
        mimeType: z.string().default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const visionResult = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Tu es un expert en analyse d'images et scénariste BD. Réponds uniquement en JSON valide, sans markdown ni backticks.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url" as const,
                image_url: {
                  url: `data:${input.mimeType};base64,${input.imageBase64}`,
                  detail: "high" as const,
                },
              },
              {
                type: "text" as const,
                text: `Analyse cette photo et crée un scénario de BD en 4 planches basé sur ce que tu vois.\n\nAnalyse : qui sont les personnes (description physique, âge, tenue), où sont-elles, quelle est l'ambiance ?\n\nGénère un scénario BD poétique et émouvant basé sur cette photo.\n\nFormat JSON strict :\n{\n  "character_description": "Description précise du/des personnage(s) pour DALL-E",\n  "title": "Titre BD accrocheur",\n  "cover_description": "Description de la couverture BD",\n  "cover_quote": "Phrase accroche",\n  "cover_voiceover": "Voix off couverture 25-35 mots",\n  "pages": [\n    {"page_number": 1, "scene_description": "...", "dialogue": ["..."], "narration": "...", "voiceover": "15-20 mots", "timestamp": "0:00"},\n    {"page_number": 2, "scene_description": "...", "dialogue": ["..."], "narration": "...", "voiceover": "15-20 mots", "timestamp": "0:18"},\n    {"page_number": 3, "scene_description": "...", "dialogue": ["..."], "narration": "...", "voiceover": "15-20 mots", "timestamp": "0:33"},\n    {"page_number": 4, "scene_description": "...", "dialogue": ["..."], "narration": "...", "voiceover": "15-20 mots", "timestamp": "0:47"}\n  ],\n  "voiceover_text": "Voix off globale 40-60 mots"\n}`,
              },
            ],
          },
        ],
      });

      const raw = (visionResult.choices?.[0]?.message?.content as string) ?? "{}";
      let scenario;
      try {
        scenario = JSON.parse(raw);
      } catch {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible de parser le scénario photo" });
        scenario = JSON.parse(jsonMatch[0]);
      }

      return { scenario };
    }),

  /**
   * Test de la clé API OpenAI
   */
  testApiKey: publicProcedure.query(async () => {
    if (!ENV.openaiApiKey) {
      return { valid: false, message: "Clé API non configurée" };
    }
    try {
      const response = await fetch(`${OPENAI_BASE}/models`, {
        headers: { Authorization: `Bearer ${ENV.openaiApiKey}` },
      });
      if (response.ok) {
        return { valid: true, message: "Clé API OpenAI valide ✓" };
      }
      return { valid: false, message: `Erreur ${response.status}` };
    } catch (e) {
      return { valid: false, message: String(e) };
    }
  }),
});
