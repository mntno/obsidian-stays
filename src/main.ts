import { AddBooking } from "#/booking/AddBooking";
import { AddPerson } from "#/person/AddPerson";
import { SettingsManager } from "#/settings/SettingsManager";
import type { PluginSettings } from "#/settings/types";
import { Icon } from "#/ui/constants";
import { SettingTab } from "#/ui/settings/SettingTab";
import { Api } from "#/utils/api";
import { log } from "#/utils/logger";
import { TimelineView, VIEW_TYPE_TIMELINE } from "#/views/TimelineView";
import { ConfirmationModal, Notice, Plugin } from "obsidian";

export default class Stays extends Plugin {
	private settingsManager!: SettingsManager;

	override async onload() {
		log.t();

		this.settingsManager = await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon("user-plus", "Add person", () => {
			void this.addPerson();
		});
		ribbonIconEl.addClass("stays-ribbon-class");

		this.addCommand({
			id: "add-person",
			name: "Add person",
			callback: () => {
				void this.addPerson();
			},
		});

		const bookingRibbonIconEl = this.addRibbonIcon("calendar-plus", "Add booking", () => {
			void this.addBooking();
		});
		bookingRibbonIconEl.addClass("stays-ribbon-class");

		this.addCommand({
			id: "add-booking",
			name: "Add booking",
			callback: () => {
				void this.addBooking();
			},
		});

		this.addSettingTab(new SettingTab(this, this.settingsManager));

		this.registerView(VIEW_TYPE_TIMELINE, (leaf) => new TimelineView(leaf, this.settingsManager));

		const schedulerRibbonIconEl = this.addRibbonIcon(Icon.View.Timeline, "Bookings timeline", () => {
			void this.openTimeline();
		});
		schedulerRibbonIconEl.addClass("stays-ribbon-class");

		this.addCommand({
			id: "open-guest-scheduler",
			name: "Open guest scheduler",
			callback: () => {
				void this.openTimeline();
			},
		});
	}

	override onunload() {
	}

	private async addPerson(): Promise<void> {
		const peopleFolder = this.settingsManager.settings.peopleFolder;
		if (!Api.Folder.exists(this.app.vault, peopleFolder)) {
			const modal = new ConfirmationModal(this.app);
			modal.setContent("People folder is not set up in plugin settings.");
			modal.addButton((btn) =>
				btn.setButtonText("OK").setCta().onClick(() => {
					modal.close();
				})
			);
			modal.open();
			return;
		}
		const result = await new AddPerson(this.app, peopleFolder).run();
		if (result.didCancel) {
			new Notice("Cancelled creating a new person.", 3000);
		} else if (result.error) {
			new Notice(result.error.message, 0);
		}
	}

	private async openTimeline(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_TIMELINE).at(0);
		if (existing) {
			await this.app.workspace.revealLeaf(existing);
			return;
		}
		const leaf = this.app.workspace.getLeaf("tab");
		await leaf.setViewState({
			type: VIEW_TYPE_TIMELINE,
			active: true,
		});
	}

	private async addBooking(): Promise<void> {
		const { peopleFolder, bookingsFolder } = this.settingsManager.settings;
		const peopleExists = Api.Folder.exists(this.app.vault, peopleFolder);
		const bookingsExists = Api.Folder.exists(this.app.vault, bookingsFolder);
		if (!peopleExists || !bookingsExists) {
			const missing = [!peopleExists && "People", !bookingsExists && "Bookings"]
				.filter(Boolean)
				.join(" and ");
			const modal = new ConfirmationModal(this.app);
			modal.setContent(`${missing} folder is not set up in plugin settings.`);
			modal.addButton((btn) =>
				btn.setButtonText("OK").setCta().onClick(() => {
					modal.close();
				})
			);
			modal.open();
			return;
		}
		const result = await new AddBooking(
			this.app,
			peopleFolder,
			bookingsFolder,
		).run();
		if (result.didCancel) {
			new Notice("Cancelled creating a new booking.", 3000);
		} else if (result.error) {
			new Notice(result.error.message, 0);
		}
	}

	private async loadSettings(): Promise<SettingsManager> {
		const rawSettings = await this.loadData() as Partial<PluginSettings> | null | undefined;
		return new SettingsManager(
			SettingsManager.fromPartial(rawSettings ?? undefined),
			(settings) => this.saveData(settings),
			() => { }
		);
	}
}
