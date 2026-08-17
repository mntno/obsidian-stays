import Stays from "#/main";
import { SettingTab } from "#/ui/settings/SettingTab";
import { App, PluginManifest } from "obsidian";
import { describe, expect, it, vi } from "vitest";

describe("Plugin", () => {
	it("loads and registers a settings tab", async () => {
		const plugin = new Stays({} as App, {} as PluginManifest);
		const addSettingTab = vi.spyOn(plugin, "addSettingTab");

		await plugin.onload();

		expect(addSettingTab).toHaveBeenCalledOnce();
		expect(addSettingTab.mock.calls[0]?.[0]).toBeInstanceOf(SettingTab);
	});
});
