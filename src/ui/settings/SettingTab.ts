import { SettingsChanged, SettingsManager } from "#/settings/SettingsManager";
import type { PluginSettings } from "#/settings/types";
import { Icon } from "#/ui/constants";
import { FolderSuggest } from "#/ui/FolderSuggest";
import { Api } from "#/utils/api";
import { log } from "#/utils/logger";
import { Str } from "#/utils/ts";
import { ConfirmationModal, ExtraButtonComponent, Notice, Plugin, PluginSettingTab, Setting, SettingDefinitionItem, TextComponent, normalizePath } from "obsidian";

export class SettingTab extends PluginSettingTab {
	private settingsManager: SettingsManager;
	private bookingsFolderExists = true;

	public constructor(plugin: Plugin, settingsManager: SettingsManager) {
		super(plugin.app, plugin);
		this.settingsManager = settingsManager;
		this.icon = Icon.Main;
		this.settingsManager.registerOnChangedCallback(this.onChangedCallback);
		plugin.register(() => {
			this.settingsManager.unregisterOnChangedCallback(this.onChangedCallback);
		});
	}

	private onChangedCallback: SettingsChanged = (_, isExternal) => {
		if (isExternal)
			this.update();
	}

	public override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "People folder",
				desc: "The folder in which new person notes are created.",
				render: (setting) => this.renderFolderSetting(setting, "peopleFolder", "The folder in which new person notes are created."),
			},
			{
				name: "Bookings folder",
				desc: "The folder in which new booking notes are created.",
				render: (setting) => this.renderFolderSetting(setting, "bookingsFolder", "The folder in which new booking notes are created."),
			},
		];
	}

	private renderFolderSetting(setting: Setting, settingKey: keyof PluginSettings, description: string) {
		let createFolderBtn!: ExtraButtonComponent;
		let textComponent!: TextComponent;

		setting.addExtraButton((button) => {
			createFolderBtn = button;
			button.setIcon("folder-plus");
			button.onClick(async () => {
				const currentText = Str.trimmedNonEmpty(textComponent.getValue());
				if (currentText !== undefined) {
					const path = normalizePath(currentText);
					log.d("Creating folder if not exists", path);
					if (!Api.Folder.exists(this.app.vault, path)) {
						const modal = new ConfirmationModal(this.app);
						modal.setTitle("Create folder");
						modal.setContent(`Create folder "${path}"?`);
						modal.addButton((btn) =>
							btn.setButtonText("Confirm").setCta().onClick(async () => {
								try {
									await this.app.vault.createFolder(path);
									new Notice(`Created folder at "${path}".`);
									textComponent.inputEl.trigger("input");
								} catch (e) {
									log.setting.e(`Couldn't create folder at ${path}`, e);
									new Notice(`Couldn't create folder at ${path}. ${String(e)}`);
								}
								modal.close();
							})
						);
						modal.addCancelButton();
						modal.open();
					}

				}
			});
		});

		const update = () => {
			let exists = false;
			let normalizedText: string | undefined;

			const currentText = Str.trimmedNonEmpty(textComponent.getValue());
			if (currentText === undefined) {
				exists = true; // Setting root is not allowed
			}
			else {
				normalizedText = normalizePath(currentText);
				exists = !Api.Folder.isRootPath(this.app.vault, normalizedText, true) && Api.Folder.exists(this.app.vault, normalizedText);
			}

			createFolderBtn.setDisabled(exists);
			if (exists) {
				createFolderBtn.extraSettingsEl.hide();
				setting.setErrorMessage(Str.empty);
			} else {
				createFolderBtn.extraSettingsEl.show();
				setting.setErrorMessage(`Folder ${normalizedText} does not exist.`)
				createFolderBtn.setTooltip("Create folder " + normalizedText);
			}

			const currentFolder = Str.nonEmpty(this.settingsManager.settings[settingKey]);
			setting.setDesc(description + " " + (currentFolder !== undefined ? `Currently set to ${normalizedText}.` : "No folder is currently set."))
		};

		setting.addText((text) => {
			textComponent = text;
			text
				.setValue(this.settingsManager.settings[settingKey])
				.setPlaceholder("Folder path")
				.onChange(async (value) => {

					const saveEmpty = async () => {
						log.setting.d("Saving empty value");
						this.settingsManager.settings[settingKey] = Str.empty;
						await this.settingsManager.save();
					}

					if (Str.isTrimmedNonEmpty(value)) {
						const path = normalizePath(value);

						if (Api.Folder.isRootPath(this.app.vault, path, true)) {
							log.setting.d(`Not saving. Path "${path}" is a root path.`);
						}
						else {
							const folderExists = Str.isNonEmpty(path) && Api.Folder.exists(this.app.vault, path);
							if (folderExists) {
								log.d(`Setting ${settingKey} to "${path}".`);
								this.settingsManager.settings[settingKey] = value.trim();
								await this.settingsManager.save();
							}
							else {
								await saveEmpty();
							}
						}
					} else {
						await saveEmpty();
					}

					update();
				});
			new FolderSuggest(this.app, text.inputEl);
		});

		update();
	}

	override getControlValue(key: string): unknown {
		return (this.settingsManager.settings as unknown as Record<string, unknown>)[key];
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		(this.settingsManager.settings as unknown as Record<string, unknown>)[key] =
			Str.is(value) ? value.trim() : value;
		await this.settingsManager.save();
		this.update();
	}

}
