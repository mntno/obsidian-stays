import { SettingsManager } from "#/settings/SettingsManager";
import { describe, expect, it, vi } from "vitest";

describe("SettingsManager", () => {
	describe("fromPartial", () => {
		it("returns defaults when no data", () => {
			expect(SettingsManager.fromPartial(undefined)).toEqual({ peopleFolder: "People", bookingsFolder: "Bookings" });
		});

		it("merges partial data with defaults", () => {
			expect(SettingsManager.fromPartial({ peopleFolder: "Guests" }).peopleFolder).toBe("Guests");
		});
	});

	describe("save", () => {
		it("persists settings and notifies onSaved", async () => {
			const save = vi.fn().mockResolvedValue(undefined);
			const onSaved = vi.fn();
			const manager = new SettingsManager(SettingsManager.fromPartial(undefined), save, onSaved);

			manager.settings.peopleFolder = "changed";
			await manager.save();

			expect(save).toHaveBeenCalledWith(manager.settings);
			expect(onSaved).toHaveBeenCalledOnce();
		});
	});

	describe("onSettingsChangedExternally", () => {
		it("returns false when settings are equal", async () => {
			const manager = new SettingsManager({ peopleFolder: "a", bookingsFolder: "b" }, async () => { }, () => { });
			expect(await manager.onSettingsChangedExternally({ peopleFolder: "a", bookingsFolder: "b" })).toBe(false);
		});

		it("returns true and notifies when settings differ", async () => {
			const manager = new SettingsManager({ peopleFolder: "a", bookingsFolder: "b" }, async () => { }, () => { });
			const listener = vi.fn();
			manager.registerOnChangedCallback(listener);

			const changed = await manager.onSettingsChangedExternally({ peopleFolder: "b", bookingsFolder: "b" });

			expect(changed).toBe(true);
			expect(manager.settings.peopleFolder).toBe("b");
			expect(listener).toHaveBeenCalledWith(manager.settings, true);
		});

		it("does not notify unchanged listeners twice on re-registration", async () => {
			const manager = new SettingsManager({ peopleFolder: "a", bookingsFolder: "b" }, async () => { }, () => { });
			const listener = vi.fn();
			manager.registerOnChangedCallback(listener);
			manager.registerOnChangedCallback(listener);
			await manager.onSettingsChangedExternally({ peopleFolder: "b", bookingsFolder: "b" });
			expect(listener).toHaveBeenCalledOnce();
		});
	});
});
