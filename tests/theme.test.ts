import test from "node:test";
import assert from "node:assert/strict";
import { foreground, contrastRatio } from "../shared/theme";
test("club text remains readable across light, dark and middle-luminance colors", () => {
  for (let r = 0; r <= 255; r += 17)
    for (let g = 0; g <= 255; g += 17)
      for (let b = 0; b <= 255; b += 17) {
        const hex =
          "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
        assert.ok(contrastRatio(foreground(hex), hex) >= 4.5, hex);
      }
});
