import { describe, expect, it } from "vitest";
import { buildWalkthrough, Grid, Pair, solve } from "../src/engine";

const suppliedTwinGrid = "............1....4..5.4.1.3.8..14.2...92634...4.85..7.5.6.8.2..3....7.......................4........2.783.44..1..59...17.96...89..4..18.754.1........2...........";

const parse = (text: string, offset: number): Grid => Array.from({ length: 9 }, (_, row) =>
  Array.from({ length: 9 }, (_, column) => {
    const value = text[offset + row * 9 + column];
    return value === "." ? 0 : Number(value);
  }),
);

const copy = (pair: Pair): Pair => ({ left: pair.left.map(row => [...row]), right: pair.right.map(row => [...row]) });
const filled = (pair: Pair) => pair.left.flat().filter(Boolean).length + pair.right.flat().filter(Boolean).length;

describe("walkthrough replay regression", () => {
  it("never removes a placed value for the supplied twin grid", () => {
    const puzzle: Pair = { left: parse(suppliedTwinGrid, 0), right: parse(suppliedTwinGrid, 81) };
    const solution = solve(puzzle);
    expect(solution).not.toBeNull();
    const walkthrough = buildWalkthrough(puzzle, solution!);
    const replay = copy(puzzle);

    for (const step of walkthrough.steps) {
      const before = copy(replay);
      const beforeFilled = filled(replay);
      if (step.kind === "placement") {
        const grid = step.side ? replay.right : replay.left;
        expect(grid[step.row][step.column]).toBe(0);
        grid[step.row][step.column] = step.digit;
        expect(filled(replay)).toBe(beforeFilled + 1);
      } else {
        expect(filled(replay)).toBe(beforeFilled);
        for (const item of step.removed) {
          expect((item.side ? replay.right : replay.left)[item.row][item.column]).toBe(0);
        }
      }
      for (const side of ["left", "right"] as const) for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
        if (before[side][row][column]) expect(replay[side][row][column]).toBe(before[side][row][column]);
      }
    }

    expect(replay).toEqual(solution);
  });
});
