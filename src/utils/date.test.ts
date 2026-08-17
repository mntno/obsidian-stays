import { describe, expect, it } from "vitest";
import { formatDate } from "#/utils/date";

describe("formatDate", () => {
	it("formats as YYYY-MM-DD HH:mm", () => {
		expect(formatDate(new Date(2025, 1, 15, 12, 3))).toBe("2025-02-15 12:03");
	});

	it("pads single-digit values", () => {
		expect(formatDate(new Date(2025, 0, 5, 9, 7))).toBe("2025-01-05 09:07");
	});
});
