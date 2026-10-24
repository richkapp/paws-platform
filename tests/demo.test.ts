import { describe, expect, test, spyOn } from "bun:test";
import { demoDogs } from "../src/data/demoDogs";
import { buildPayload, parseDog } from "../src/lib/adminDogForm";
import {
  evaluate,
  rankDogs,
  toMatchDog,
  type MatchDog,
} from "../src/lib/matchEngine";
import { fosterStatus, sizeGroup } from "../src/lib/dogFacts";
import { shelter } from "../src/config/shelter";
import { submitFormSubmission } from "../src/lib/formSubmission";
import { existsSync } from "node:fs";

const record = (id: string) => demoDogs.find((dog) => dog.id === id)!;

describe("fictional demo and shared admin/quiz contract", () => {
  test("dataset includes available/adopted and local authored galleries", () => {
    expect(demoDogs).toHaveLength(8);
    expect(demoDogs.filter((dog) => !dog.is_adopted)).toHaveLength(6);
    expect(demoDogs.filter((dog) => dog.is_adopted)).toHaveLength(2);
    expect(new Set(demoDogs.map((dog) => dog.id)).size).toBe(8);
    expect(new Set(demoDogs.map((dog) => sizeGroup(dog.size))).size).toBe(3);
    for (const dog of demoDogs) {
      expect(dog.id.startsWith("demo-")).toBe(true);
      expect(dog.photos!.length).toBeGreaterThan(1);
      for (const asset of dog.photos!) {
        expect(asset.startsWith("/illustrations/")).toBe(true);
        expect(existsSync(new URL("../public" + asset, import.meta.url))).toBe(
          true,
        );
      }
    }
  });
  test("blank public destinations and forms remain opt-in", () => {
    expect(shelter.forms.enabled).toBe(false);
    expect(shelter.contact).toEqual({ email: "", phone: "" });
    expect(shelter.publicUrl).toBe("");
    expect(Object.values(shelter.social).every((value) => value === "")).toBe(
      true,
    );
    expect(
      Object.values(shelter.donations).every((value) => value === ""),
    ).toBe(true);
  });
  test("admin roundtrip keeps foster status and quiz traits", () => {
    const dog = record("demo-tulipa");
    const payload = buildPayload(parseDog(dog));
    expect(payload.name).toBe("Tulipa");
    expect(payload.sex).toBe("female");
    expect(payload.size).toBe("small-medium");
    expect(payload.age).toBe("Nasceu em 2023");
    expect(payload.traits).toEqual({
      energia: 2,
      receio: 1,
      carente: true,
      aves: "sim",
      criancas: "sim",
    });
    expect(Boolean(payload.traits.fuga)).toBe(false);
    expect(Boolean(payload.traits.padrinho)).toBe(false);
    expect(fosterStatus(payload.description)).toBe("família temporária");
    expect(payload.description).toContain("Sociável com gatos");
  });
  test("a public demo submission returns disabled without any network call", async () => {
    const fetch = spyOn(globalThis, "fetch");
    try {
      expect(
        await submitFormSubmission({
          kind: "volunteer",
          locale: "en",
          source: "test",
          pageUrl: "",
        }),
      ).toEqual({ status: "disabled" });
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
  test("quiz only includes available dogs with enough traits", () => {
    expect(demoDogs.map(toMatchDog).filter(Boolean)).toHaveLength(6);
    expect(toMatchDog(record("demo-fig"))).toBeNull();
    expect(toMatchDog({ ...record("demo-miso"), traits: {} })).toBeNull();
    expect(toMatchDog({ ...record("demo-miso"), sex: null })).toBeNull();
  });
  test("known incompatibilities exclude a match instead of assigning a score", () => {
    const nori = toMatchDog(record("demo-nori"))!;
    expect(evaluate(nori, { animais: ["gato"] }, 2026)).toBeNull();
    expect(evaluate(nori, { animais: ["quinta"] }, 2026)).toBeNull();
    expect(evaluate(nori, { porte: "pequeno" }, 2026)).toBeNull();
  });
  test("ranking returns bounded descending scores and locale-independent results", () => {
    const dogs = demoDogs
      .map(toMatchDog)
      .filter((dog): dog is MatchDog => dog !== null);
    const answers = {
      casa: "apartamento",
      jardim: "nao",
      trabalho: "casa",
      passeios: "1",
      criancas: "nenhuma",
      exp: "nenhuma",
      animais: ["gato"],
      prefEnergia: "calmo",
    };
    const pt = rankDogs(dogs, answers, 2026, "pt");
    const en = rankDogs(dogs, answers, 2026, "en");
    expect(pt.all[0].d.nome).toBe("Miso");
    expect(pt.all.some((result) => result.d.nome === "Nori")).toBe(false);
    expect(pt.all.map((result) => [result.d.id, result.score])).toEqual(
      en.all.map((result) => [result.d.id, result.score]),
    );
    expect(
      pt.all.every((result) => result.score >= 0 && result.score <= 100),
    ).toBe(true);
    expect(pt.all.map((result) => result.score)).toEqual(
      [...pt.all.map((result) => result.score)].sort((a, b) => b - a),
    );
    expect(pt.shown.length).toBeLessThanOrEqual(4);
    expect(en.all[0].good).toContain("Calm, does well in an apartment");
  });
});
