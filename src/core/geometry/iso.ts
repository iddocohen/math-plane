/**
 * The isometric projection of the prototype's `isoP` (research R3), shared by the drawing helpers, the readability
 * check and the tests. `col` grows to the lower right, `row` grows to the lower left (toward "vorn"), and `z` grows up.
 * A cube is `s` wide on screen; its height is drawn 1.1 times taller so stacks read clearly.
 */
export function isoPoint(col: number, row: number, z: number, s: number): { x: number; y: number } {
  return { x: (col - row) * s, y: ((col + row) * s) / 2 - z * 1.1 * s };
}
