import type { PluginSettings } from "#/settings/types";

export class SettingDefaults {

	/** Returns the initial plugin settings. */
	public static forInitial = (): PluginSettings => ({
		peopleFolder: "People",
		bookingsFolder: "Bookings",
	});
}
