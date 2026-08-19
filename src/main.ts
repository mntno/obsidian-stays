import { AddBookingModal } from "#/modals/AddBookingModal";
import { AddPersonModal } from "#/modals/AddPersonModal";
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

	public override async onload() {
		log.t();

		this.settingsManager = await this.loadSettings();
		this.addSettingTab(new SettingTab(this, this.settingsManager));

		[
			this.addRibbonIcon(Icon.Action.ADD_USER, "Add person", () => this.addPerson()),
			this.addRibbonIcon(Icon.Action.ADD_BOOKING, "Add booking", () => this.addBooking()),
			this.addRibbonIcon(Icon.View.Timeline, "Bookings timeline", () => this.openTimeline().catch(log.catch)),
		].forEach((el) => {
			el.addClass("stays-ribbon-class");
		});

		this.addCommand({ id: "add-person", name: "Add person", callback: () => this.addPerson() });
		this.addCommand({ id: "add-booking", name: "Add booking", callback: () => this.addBooking() });
		this.addCommand({ id: "open-calendar-timeline", name: "Open calendar timeline", callback: () => this.openTimeline().catch(log.catch) });

		this.registerView(VIEW_TYPE_TIMELINE, (leaf) => new TimelineView(leaf, this.settingsManager));
	}

	public override onunload() {
	}

	private addPerson(): void {
		const peopleFolder = this.settingsManager.settings.peopleFolder;
		if (Api.Folder.exists(this.app.vault, peopleFolder)) {
			new AddPersonModal(this.app, peopleFolder, (result) => {
				if (result.error)
					new Notice(result.error.message, 0);
			}).open();
		} else {
			const modal = new ConfirmationModal(this.app);
			modal.setContent("People folder is not set up in plugin settings.");
			modal.addButton((btn) => btn.setButtonText("OK").setCta().onClick(() => modal.close()));
			modal.open();
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

	private addBooking() {
		const { peopleFolder, bookingsFolder } = this.settingsManager.settings;
		const peopleExists = Api.Folder.exists(this.app.vault, peopleFolder);
		const bookingsExists = Api.Folder.exists(this.app.vault, bookingsFolder);
		if (!peopleExists || !bookingsExists) {
			const missing = [!peopleExists && "People", !bookingsExists && "Bookings"]
				.filter(Boolean)
				.join(" and ");
			const modal = new ConfirmationModal(this.app);
			modal.setContent(`${missing} folder is not set up in plugin settings.`);
			modal.addButton((btn) => btn.setButtonText("OK").setCta().onClick(() => modal.close()));
			modal.open();
		} else {
			new AddBookingModal(this.app, peopleFolder, bookingsFolder, (result) => {
				if (result.error)
					new Notice(result.error.message, 0);
			}).open();
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
