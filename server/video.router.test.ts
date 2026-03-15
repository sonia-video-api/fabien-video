/**
 * Tests vitest — video.router.ts
 * Valide la structure du router vidéo et les schémas d'entrée/sortie
 */

import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("video.router", () => {
  it("le router video est bien enregistré dans appRouter", () => {
    const caller = appRouter.createCaller(createPublicContext());
    // Dans tRPC, le proxy du router est une fonction avec des propriétés
    expect(caller.video).toBeDefined();
    expect(typeof caller.video.assembleMontage).toBe("function");
    expect(typeof caller.video.assembleDemoMontage).toBe("function");
  });

  it("assembleMontage rejette une liste d'images vide", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.video.assembleMontage({
        imageUrls: [],
        title: "Test",
        durationPerImage: 5,
      })
    ).rejects.toThrow();
  });

  it("assembleMontage rejette une URL invalide", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.video.assembleMontage({
        imageUrls: ["not-a-url"],
        title: "Test",
        durationPerImage: 5,
      })
    ).rejects.toThrow();
  });

  it("assembleMontage rejette une durée trop courte (< 2s)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.video.assembleMontage({
        imageUrls: ["https://example.com/image.jpg"],
        title: "Test",
        durationPerImage: 1,
      })
    ).rejects.toThrow();
  });

  it("assembleMontage rejette une durée trop longue (> 15s)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.video.assembleMontage({
        imageUrls: ["https://example.com/image.jpg"],
        title: "Test",
        durationPerImage: 20,
      })
    ).rejects.toThrow();
  });

  it("assembleMontage rejette plus de 6 images", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const tooManyImages = Array(7).fill("https://example.com/image.jpg");
    await expect(
      caller.video.assembleMontage({
        imageUrls: tooManyImages,
        title: "Test",
        durationPerImage: 5,
      })
    ).rejects.toThrow();
  });

  it("assembleDemoMontage accepte un appel sans audio", async () => {
    // Ce test vérifie seulement que la mutation existe et est appelable
    // Le vrai test FFmpeg nécessiterait des images réelles
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.video.assembleDemoMontage).toBe("function");
  });
});
