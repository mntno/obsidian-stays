import { describe, expect, it } from "vitest";
import { capitalizeWords, toCamelCase } from "#/utils/stringUtils";

describe("capitalizeWords", () => {
	it("capitalizes the first letter of each word", () => {
		expect(capitalizeWords("zara nilsen")).toBe("Zara Nilsen");
	});

	it("capitalizes accented first letters and leaves the rest untouched", () => {
		expect(capitalizeWords("léa fischer")).toBe("Léa Fischer");
	});

	it("trims surrounding whitespace", () => {
		expect(capitalizeWords("  zara nilsen ")).toBe("Zara Nilsen");
	});
});

describe("toCamelCase", () => {
	it("converts a single word to lower camel case", () => {
		expect(toCamelCase("Email")).toBe("email");
		expect(toCamelCase("Phone")).toBe("phone");
		expect(toCamelCase("Notes")).toBe("notes");
	});

	it("converts multi-word phrases to camel case", () => {
		expect(toCamelCase("Full name")).toBe("fullName");
	});
});
