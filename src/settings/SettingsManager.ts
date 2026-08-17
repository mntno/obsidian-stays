import { SettingDefaults } from "#/settings/SettingDefaults";
import type { PluginSettings } from "#/settings/types";
import { log } from "#/utils/logger";

export type SettingsChanged = (settings: PluginSettings, isExternal: boolean) => Promise<void> | void;

export class SettingsManager {

	public settings: PluginSettings;

	public readonly save: () => Promise<void>;

	public constructor(
		settings: PluginSettings,
		save: (settings: PluginSettings) => Promise<void>,
		onSaved: () => void) {
		this.settings = settings;
		this.save = async () => {
			await save(this.settings);
			onSaved();
			await this.notifyOnChangedListeners(false);
		};
	}

	/**
	 * Merges raw (potentially partial) settings with defaults to produce a complete {@link PluginSettings} object.
	 *
	 * @param rawSettings - Deserialized settings to handle, or `undefined` if settings have never been serialized.
	 * @returns A new {@link PluginSettings} object with all fields present.
	 */
	public static fromPartial(rawSettings: Partial<PluginSettings> | undefined): PluginSettings {
		const defaults = SettingDefaults.forInitial();

		return {
			...defaults,
			...rawSettings || {}
		};
	}

	/**
	 * Overwrites the current settings with {@link settings} if they are not equal, in which case the change listeners are invoked.
	 *
	 * Note: {@link save} is not called. If the method returns `true`, it's the caller's responsibility to persist the new values.
	 *
	 * @param settings
	 * @returns `true` if {@link settings} is not equal to the current settings.
	 */
	public async onSettingsChangedExternally(settings: PluginSettings, changed?: (settings: PluginSettings) => void) {
		const isNotEqual = !this.equals(settings, this.settings);
		if (isNotEqual) {
			this.settings = settings;
			changed?.(this.settings);
			await this.notifyOnChangedListeners(true);
		}
		return isNotEqual;
	}

	public registerOnChangedCallback(evt: SettingsChanged) {
		if (!this.registeredChangedCallbacks.includes(evt))
			this.registeredChangedCallbacks.push(evt);
	}

	public unregisterOnChangedCallback(evt: SettingsChanged) {
		this.registeredChangedCallbacks = this.registeredChangedCallbacks.filter(callback => callback !== evt);
	}

	private async notifyOnChangedListeners(isExternal: boolean) {
		for (const cb of this.registeredChangedCallbacks) {
			try {
				await cb(this.settings, isExternal);
			} catch (e) {
				log.e("Error executing settings changed callback:", e);
			}
		}
	}

	private registeredChangedCallbacks: SettingsChanged[] = [];

	private equals(a: PluginSettings, b: PluginSettings): boolean {
		return a.peopleFolder === b.peopleFolder
			&& a.bookingsFolder === b.bookingsFolder;
	}
}
