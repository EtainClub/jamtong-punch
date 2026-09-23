import { describe, expect, test } from "vitest";
import type { Relationship } from "@/content/schema";
import { layoutEgoGraph, MAX_NEIGHBOURS, strokeLevel } from "./graph";

const relationship = (other: string, weight: number): Relationship => {
  const personIds = ["center", other].sort() as [string, string];
  return { pairId: personIds.join("__"), personIds, weight, counts: { mentions: weight, evaluations: 0 }, firstAt: "2024-01-01", lastAt: "2024-01-01", evidence: [] };
};

describe("layoutEgoGraph", () => {
  test("is deterministic regardless of input order", () => {
    const items = [relationship("b", 2), relationship("a", 5), relationship("c", 2)];
    const first = layoutEgoGraph("center", items, () => true);
    const second = layoutEgoGraph("center", [...items].reverse(), () => true);
    expect(second).toEqual(first);
  });

  test("puts the strongest neighbour at the top and ties in id order", () => {
    const graph = layoutEgoGraph("center", [relationship("c", 2), relationship("b", 2), relationship("a", 5)], () => true);
    expect(graph.nodes.map((node) => node.id)).toEqual(["a", "b", "c"]);
    expect(graph.nodes[0]).toMatchObject({ x: 180, y: 50.4 });
  });

  test("shows at most twelve neighbours and counts the rest", () => {
    const items = Array.from({ length: 15 }, (_, index) => relationship(`p${String(index).padStart(2, "0")}`, 1));
    const graph = layoutEgoGraph("center", items, () => true);
    expect(graph.nodes).toHaveLength(MAX_NEIGHBOURS);
    expect(graph.overflow).toBe(3);
  });

  test("leaves out people who are not public", () => {
    const graph = layoutEgoGraph("center", [relationship("a", 1), relationship("b", 1)], (id) => id === "b");
    expect(graph.nodes.map((node) => node.id)).toEqual(["b"]);
  });
});

test("line thickness uses fixed thresholds", () => {
  expect([1, 2, 3, 5, 6, 40].map(strokeLevel)).toEqual([1, 1, 2, 2, 3, 3]);
});
