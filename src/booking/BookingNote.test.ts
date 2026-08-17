import { describe, expect, it } from "vitest";
import { createBookingNote, deriveRoomCode, formatDateOnly } from "#/booking/BookingNote";
import type { AddBookingResult, BookingInfo } from "#/booking/types";

const baseBookingInfo: BookingInfo = {
	personName: "Omar Jenson",
	personFile: {} as never,
	title: "Omar Jenson (EW1)",
	date: new Date("2026-06-10"),
	endDate: new Date("2026-06-11"),
	applicationFormUrl: undefined,
};

function sampleResult(overrides: Partial<AddBookingResult> = {}): AddBookingResult {
	return {
		didCancel: false,
		bookingInfo: { ...baseBookingInfo },
		roomName: "East Wing 1",
		...overrides,
	};
}

describe("deriveRoomCode", () => {
	it("derives multi-word room codes", () => {
		expect(deriveRoomCode("East Wing 1")).toBe("EW1");
		expect(deriveRoomCode("North Lodge 1")).toBe("NL1");
		expect(deriveRoomCode("South Villa 1")).toBe("SV1");
	});

	it("derives two-word room codes", () => {
		expect(deriveRoomCode("West Suite")).toBe("WS");
	});

	it("derives single-word room codes", () => {
		expect(deriveRoomCode("Garden Annex")).toBe("GA");
	});
});

describe("formatDateOnly", () => {
	it("formats a date as YYYY-MM-DD", () => {
		expect(formatDateOnly(new Date("2026-06-10"))).toBe("2026-06-10");
	});

	it("pads single-digit months and days", () => {
		expect(formatDateOnly(new Date(2026, 0, 5))).toBe("2026-01-05");
	});
});

describe("createBookingNote", () => {
	it("creates a booking note file", async () => {
		const files: Record<string, string> = {};
		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => files[path] ?? null,
				create: async (path: string, content: string) => {
					files[path] = content;
					return { path } as never;
				},
			},
		};

		const file = await createBookingNote(app as never, "Bookings", "East Wing 1", sampleResult());
		expect(file).not.toBeNull();
		const path = "Bookings/East Wing 1/2026-06-10 Omar Jenson.md";
		const content = files[path];
		expect(content).toContain("# Omar Jenson");
		expect(content).toContain("[[Omar Jenson]]");
		expect(content).toContain("2026-06-10");
		expect(content).toContain("## Booking Details");
	});

	it("returns null if note already exists", async () => {
		const app = {
			vault: {
				getAbstractFileByPath: () => ({}) as never,
				create: async () => { throw new Error("should not be called"); },
			},
		};

		const file = await createBookingNote(app as never, "Bookings", "East Wing 1", sampleResult());
		expect(file).toBeNull();
	});

	it("includes application form section when URL provided", async () => {
		const files: Record<string, string> = {};
		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => files[path] ?? null,
				create: async (path: string, content: string) => {
					files[path] = content;
					return { path } as never;
				},
			},
		};

		const result = sampleResult({
			bookingInfo: { ...baseBookingInfo, applicationFormUrl: "https://forms.example.com/abc" },
		});

		const file = await createBookingNote(app as never, "Bookings", "East Wing 1", result);
		expect(file).not.toBeNull();
		const path = "Bookings/East Wing 1/2026-06-10 Omar Jenson.md";
		expect(files[path]).toContain("## Application Form");
		expect(files[path]).toContain("datacorejsx");
		expect(files[path]).toContain("RenderGoogleForm");
	});

	it("omits application form section when no URL", async () => {
		const files: Record<string, string> = {};
		const app = {
			vault: {
				getAbstractFileByPath: (path: string) => files[path] ?? null,
				create: async (path: string, content: string) => {
					files[path] = content;
					return { path } as never;
				},
			},
		};

		const file = await createBookingNote(app as never, "Bookings", "East Wing 1", sampleResult());
		expect(file).not.toBeNull();
		const path = "Bookings/East Wing 1/2026-06-10 Omar Jenson.md";
		expect(files[path]).not.toContain("## Application Form");
	});
});
