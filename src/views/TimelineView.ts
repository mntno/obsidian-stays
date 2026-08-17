import { SettingsManager } from "#/settings/SettingsManager";
import { Icon } from "#/ui/constants";
import { Api } from "#/utils/api";
import { log } from "#/utils/logger";
import Calendar from "@event-calendar/core";
import Interaction from "@event-calendar/interaction";
import ResourceTimeline from "@event-calendar/resource-timeline";
import { ItemView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

interface EventInfo {
    event: { id: string | number; [key: string]: unknown };
}

export const VIEW_TYPE_TIMELINE = "stays-view-timeline";

export class TimelineView extends ItemView {
	private calendar: Calendar | null = null;
	private readonly settingsManager: SettingsManager;

	constructor(leaf: WorkspaceLeaf, settingsManager: SettingsManager) {
		super(leaf);
		this.settingsManager = settingsManager;
	}

	public getViewType(): string {
		return VIEW_TYPE_TIMELINE;
	}

	public getDisplayText(): string {
		return "Current bookings";
	}

	public override getIcon(): string {
		return Icon.View.Timeline;
	}

	override async onOpen(): Promise<void> {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();

		// 1. Fetch Rooms and Bookings from Obsidian Vault
		const resources = this.loadRoomsFromVault();
		const events = this.loadBookingsFromVault();

		// 2. Initialize Event Calendar Timeline View
		this.calendar = new Calendar({
			target: container,
			props: {
				plugins: [ResourceTimeline, Interaction],
				options: {
					view: "resourceTimelineMonth",
					resources: resources,
					events: events,
					editable: true,
					// Handle booking drag-and-drop to update Obsidian frontmatter
					eventDrop: (info: EventInfo) => {
						this.updateBookingNote(info.event);
					},
					eventResize: (info: EventInfo) => {
						this.updateBookingNote(info.event);
					}
				}
			}
		});

		// 3. Watch for changes in the bookings folder
		const bookingsFolder = this.settingsManager.settings.bookingsFolder;
		const prefix = bookingsFolder + "/";
		const onMetadataChanged = (file: TFile) => {
			if (!file.path.startsWith(prefix)) return;
			this.refreshCalendar();
		};
		const onFileDeleted = (file: TAbstractFile) => {
			if (!file.path.startsWith(prefix)) return;
			this.refreshCalendar();
		};
		const onFileRenamed = (file: TAbstractFile, oldPath: string) => {
			if (!file.path.startsWith(prefix) && !oldPath.startsWith(prefix)) return;
			this.refreshCalendar();
		};

		this.registerEvent(this.app.metadataCache.on("changed", onMetadataChanged));
		this.registerEvent(this.app.vault.on("delete", onFileDeleted));
		this.registerEvent(this.app.vault.on("rename", onFileRenamed));
	}

	private loadRoomsFromVault() {
		const folder = Api.Folder.getChildren(
			this.app.vault,
			this.settingsManager.settings.bookingsFolder,
		);

		return folder.map((f) => ({
			id: f.name,
			title: f.name,
		}));
	}

	private loadBookingsFromVault() {
		const bookingsFolder = this.settingsManager.settings.bookingsFolder;
		const roomFolders = Api.Folder.getChildren(this.app.vault, bookingsFolder);
		const events: Array<{
			id: string;
			resourceId: string;
			start: string;
			end?: string;
			title: string;
		}> = [];

		for (const room of roomFolders) {
			const files = room.children.filter(
				(child): child is TFile => child instanceof TFile && child.extension === "md",
			);

			for (const file of files) {
				const fm: Record<string, unknown> | undefined = this.app.metadataCache.getFileCache(file)?.frontmatter;
				if (!fm) continue;

				const date = fm["date"];
				if (typeof date !== "string") continue;

				const endDate = fm["endDate"];
				const title = fm["title"];

				events.push({
					id: file.path,
					resourceId: room.name,
					start: date,
					end: typeof endDate === "string" ? endDate : undefined,
					title: typeof title === "string" ? title : file.basename,
				});
			}
		}

		return events;
	}

	private refreshCalendar() {
		if (!this.calendar) return;
		this.calendar.setOption("resources", this.loadRoomsFromVault());
		this.calendar.setOption("events", this.loadBookingsFromVault());
	}

	private updateBookingNote(event: EventInfo["event"]) {
		log.t(event);
		// Use this.app.fileManager.processFrontMatter() to sync changes back to .md files
	}

	public override async onClose(): Promise<void> {
		if (this.calendar) {
			this.calendar.$destroy();
		}
	}
}
