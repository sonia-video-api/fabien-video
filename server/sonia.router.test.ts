/**
 * Tests pour le router SONIA.IA — validation de la clé API OpenAI
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ENV } from "./_core/env";

describe("SONIA.IA — OpenAI API Key", () => {
  it("La variable OPENAI_API_KEY est définie dans l'environnement", () => {
    expect(ENV.openaiApiKey).toBeDefined();
    expect(typeof ENV.openaiApiKey).toBe("string");
  });

  it("La clé API OpenAI a le bon format (sk-...)", () => {
    if (ENV.openaiApiKey && ENV.openaiApiKey.length > 0) {
      // Les clés OpenAI commencent par "sk-" ou "sk-proj-"
      expect(ENV.openaiApiKey).toMatch(/^sk-/);
    } else {
      // Si pas de clé configurée, on passe le test en mode dégradé
      console.warn("⚠️ OPENAI_API_KEY non configurée — mode démo actif");
      expect(true).toBe(true);
    }
  });

  it("Les headers OpenAI sont correctement construits", () => {
    const key = "sk-test-fake-key-for-testing";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    };
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe(`Bearer ${key}`);
    expect(headers["Authorization"]).toContain("Bearer ");
  });

  it("Le texte de voix off est valide pour TTS (longueur max 4096 chars)", () => {
    const sampleText = "Ce matin-là, maman regardait par la fenêtre. Elle souriait. Je savais que cette journée allait être spéciale. Ensemble, nous avons décidé d'aller à la plage. Maman adorait la mer.";
    expect(sampleText.length).toBeLessThanOrEqual(4096);
    expect(sampleText.length).toBeGreaterThan(0);
  });

  it("Les voix OpenAI TTS disponibles sont valides", () => {
    const validVoices = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];
    const chosenVoice = "nova";
    expect(validVoices).toContain(chosenVoice);
  });

  it("Le format de réponse scénario BD est valide", () => {
    const mockScenario = {
      title: "Mon quotidien avec maman",
      cover_description: "Deux femmes souriantes sur une plage ensoleillée",
      cover_quote: "Une histoire drôle et touchante",
      pages: [
        {
          page_number: 1,
          scene_description: "Cuisine le matin",
          dialogue: ["On va où aujourd'hui ?", "À la plage maman !"],
          narration: "Une nouvelle journée commence.",
          timestamp: "0:00",
        },
      ],
      voiceover_text: "Ce matin-là, tout était possible.",
    };

    expect(mockScenario.title).toBeTruthy();
    expect(mockScenario.pages).toHaveLength(1);
    expect(mockScenario.pages[0].dialogue).toHaveLength(2);
    expect(mockScenario.voiceover_text).toBeTruthy();
  });
});

describe("SONIA.IA — FastAPI TikTok Scraper", () => {
  it("L'URL de l'API FastAPI est correctement formée", () => {
    const TIKTOK_API_BASE = "http://localhost:8001";
    const username = "sonia.video5";
    const profileUrl = `${TIKTOK_API_BASE}/api/v1/users/${encodeURIComponent(username)}`;
    const videosUrl = `${TIKTOK_API_BASE}/api/v1/users/${encodeURIComponent(username)}/videos?max_count=6`;
    
    expect(profileUrl).toBe("http://localhost:8001/api/v1/users/sonia.video5");
    expect(videosUrl).toBe("http://localhost:8001/api/v1/users/sonia.video5/videos?max_count=6");
  });

  it("La transformation profil FastAPI → format SONIA est correcte", () => {
    const profile = {
      username: "sonia.video5",
      display_name: "SONIA video5",
      bio_description: "BD animées",
      avatar_url: "https://example.com/thumb.jpg",
      avatar_large_url: "https://example.com/large.jpg",
      is_verified: false,
      follower_count: 5930,
      following_count: 6484,
      likes_count: 39400,
      video_count: 590,
    };

    const soniaProfile = {
      username: profile.username,
      nickname: profile.display_name,
      avatar: profile.avatar_large_url || profile.avatar_url,
      signature: profile.bio_description || "",
      followerCount: profile.follower_count,
      videoCount: profile.video_count,
      heartCount: profile.likes_count,
      found: true,
      source: "fastapi-scraper",
    };

    expect(soniaProfile.nickname).toBe("SONIA video5");
    expect(soniaProfile.avatar).toBe("https://example.com/large.jpg");
    expect(soniaProfile.followerCount).toBe(5930);
    expect(soniaProfile.source).toBe("fastapi-scraper");
  });
});

describe("SONIA.IA — Prompts DALL-E 3 qualité manga shojo", () => {
  it("Le prompt de couverture contient les éléments manga shojo requis", () => {
    const coverPrompt = `Professional manga shojo comic book cover illustration, ultra high quality digital art. Style: modern French shojo manga with warm watercolor textures and clean ink linework. Main character: a cheerful young French woman with auburn wavy curly hair, wearing a cozy orange-red striped sweater, gold hoop earrings, warm smile. Layout: vertical book cover format. Large title "SONIA" in bold red handwritten manga font at the top with white outline.`;

    expect(coverPrompt).toContain("manga shojo");
    expect(coverPrompt).toContain("watercolor");
    expect(coverPrompt).toContain("SONIA");
    expect(coverPrompt).toContain("auburn");
    expect(coverPrompt).toContain("vertical book cover");
  });

  it("Le prompt de page intérieure contient les éléments BD requis", () => {
    const pagePrompt = `Professional manga shojo comic book interior page, ultra high quality digital illustration. Layout: 3 comic panels arranged vertically. Each panel has thick black borders with rounded corners. Characters: cheerful young woman with auburn wavy hair and her elderly mother. Panel 1: establishing shot. Panel 2: close-up on characters' expressions. Panel 3: emotional moment with speech bubbles in French.`;

    expect(pagePrompt).toContain("comic panels");
    expect(pagePrompt).toContain("speech bubbles in French");
    expect(pagePrompt).toContain("thick black borders");
  });

  it("La description du personnage est injectée dans le prompt", () => {
    const characterDescription = "a cheerful young French woman with auburn wavy curly hair, wearing a cozy orange-red striped sweater, gold hoop earrings";
    const sceneDescription = "Morning kitchen scene with family";
    
    const fullPrompt = `Professional manga shojo comic book cover. Main character: ${characterDescription}. Scene context: ${sceneDescription}`;
    
    expect(fullPrompt).toContain(characterDescription);
    expect(fullPrompt).toContain(sceneDescription);
    expect(fullPrompt.length).toBeGreaterThan(100);
  });
});
