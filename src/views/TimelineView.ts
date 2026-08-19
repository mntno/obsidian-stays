import { formatDateOnly } from "#/booking/BookingNote";
import { SettingsManager } from "#/settings/SettingsManager";
import { Icon } from "#/ui/constants";
import { Api } from "#/utils/api";
import { log } from "#/utils/logger";
import { Str } from "#/utils/ts";
import Calendar from "@event-calendar/core";
import Interaction from "@event-calendar/interaction";
import ResourceTimeline from "@event-calendar/resource-timeline";
import { ItemView, TAbstractFile, TFile, WorkspaceLeaf } from "obsidian";

interface CalendarEvent {
	id: string;
	start: Date;
	end: Date;
	resourceId: string;
	resourceIds: string[];
	title: string;
	extendedProps: Record<string, unknown>;
}

interface EventDropInfo {
	event: CalendarEvent;
	oldEvent: CalendarEvent;
	oldResource?: { id: string };
	newResource?: { id: string };
}

interface EventClickInfo {
	event: CalendarEvent;
	el: HTMLElement;
	jsEvent: MouseEvent;
	view: unknown;
}

interface EventResizeInfo {
	event: CalendarEvent;
	oldEvent: CalendarEvent;
	startDelta: { days: number; seconds: number };
	endDelta: { days: number; seconds: number };
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
					editable: false,
					eventStartEditable: true,
					eventDurationEditable: true,
					eventResizableFromStart: false,
					headerToolbar: {
						start: "title",
						center: "",
						end: "scrollToToday prev,next"
					},
					customButtons: {
						scrollToToday: {
							text: "Today",
							click: () => {
								const container = this.containerEl.children[1] as HTMLElement;
								const todayInDom = container.querySelector<HTMLElement>(".ec-body .ec-today");
								if (!todayInDom) {
									this.calendar?.setOption("date", new Date());
									// Wait for Svelte to re-render before scrolling
									window.requestAnimationFrame(() => {
										window.requestAnimationFrame(() => this.scrollToToday());
									});
								} else {
									window.requestAnimationFrame(() => this.scrollToToday(true));
								}
							}
						}
					},
					dragConstraint: (info: EventDropInfo) => {
						const roomChanged = info.oldResource !== undefined && info.newResource !== undefined;
						const dateChanged = info.event.start.getTime() !== info.oldEvent.start.getTime();
						return roomChanged && !dateChanged;
					},
					eventDrop: (info: EventDropInfo) => {
						this.handleEventDrop(info);
					},
					eventResize: (info: EventResizeInfo) => {
						this.handleEventResize(info);
					},
					eventClick: (info: EventClickInfo) => {
						this.handleEventClick(info);
					}
				}
			}
		});

		// Scroll to today after the DOM renders
		window.requestAnimationFrame(() => this.scrollToToday());

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
			id: f.path,
			title: f.name,
		}));
	}

	private loadBookingsFromVault() {
		const bookingsFolder = this.settingsManager.settings.bookingsFolder;
		const roomFolders = Api.Folder.getChildren(this.app.vault, bookingsFolder);
		const events: Array<{
			resourceId: string;
			extendedProps: { file: TFile };
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

				events.push({
					resourceId: room.path,
					extendedProps: { file },
					start: date,
					end: Str.nonEmpty(fm["endDate"]),
					title: Str.trimmedNonEmpty(fm["title"]) ?? file.basename,
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

	private handleEventClick(_info: EventClickInfo) {
		log.view.t(_info);
	}

	private handleEventDrop(info: EventDropInfo) {
		const file = info.event.extendedProps["file"];
		if (!Api.File.is(file)) return;
		const newFolderPath = info.event.resourceIds[0];
		if (!Str.isNonEmpty(newFolderPath)) return;
		const newPath = `${newFolderPath}/${file.name}`;
		void this.app.fileManager.renameFile(file, newPath);
	}

	private handleEventResize(info: EventResizeInfo) {
		const file = info.event.extendedProps["file"];
		if (!Api.File.is(file)) return;
		const endDate = formatDateOnly(info.event.end);
		void Api.Frontmatter.update(this.app, file, (fm) => {
			fm["endDate"] = endDate;
		});
	}

	private scrollToToday(animate = false) {
		const container = this.containerEl.children[1] as HTMLElement;
		const body = container.querySelector<HTMLElement>(".ec-body");
		const header = container.querySelector<HTMLElement>(".ec-header");
		if (!body) return;

		const todayEl = body.querySelector<HTMLElement>(".ec-today");
		if (!todayEl) return;

		const bodyWidth = body.clientWidth;
		const bodyRect = body.getBoundingClientRect();
		const todayRect = todayEl.getBoundingClientRect();
		const offset = todayRect.left - bodyRect.left + body.scrollLeft;
		const targetScroll = Math.max(0, offset - bodyWidth / 2);
		const behavior = animate ? "smooth" : "instant";

		body.scrollTo({ left: targetScroll, behavior });
		if (header) header.scrollTo({ left: targetScroll, behavior });
	}

	public override async onClose(): Promise<void> {
		if (this.calendar) {
			this.calendar.$destroy();
		}
	}
}
