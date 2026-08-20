import { formatDateOnly } from "#/booking/BookingNote";
import { SettingsManager } from "#/settings/SettingsManager";
import { Icon } from "#/ui/constants";
import { Api } from "#/utils/api";
import { log } from "#/utils/logger";
import { Str } from "#/utils/ts";
import { Calendar, createCalendar, destroyCalendar, Interaction, ResourceTimeline } from "@event-calendar/core";
import { IconName, ItemView, Notice, TAbstractFile, TFile, TFolder, WorkspaceLeaf } from "obsidian";

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

	public override getIcon(): IconName {
		return Icon.View.Timeline;
	}

	protected override async onOpen(): Promise<void> {
		log.view.t();
		await super.onOpen();

		const container = this.contentEl;
		container.empty();

		const eventGapRem = 0.6; // Vertical gap between booking bars, in rem. Published to the DOM as `--stays-event-gap`, which the CSS file uses for the row-head padding and the event bottom margin.
		const columnWidthRem: number = 4.6;

		const bookingsFolder = Api.Folder.get(this.app.vault, this.settingsManager.settings.bookingsFolder);
		const resources = bookingsFolder !== null ? this.loadPlaces(bookingsFolder) : [];
		const events = bookingsFolder !== null ? this.loadBookings(bookingsFolder) : [];

		const fontPx = Number.parseFloat(getComputedStyle(container).fontSize) || 16;
		const eventGapPx = eventGapRem * fontPx;

		container.setCssProps({ "--stays-event-gap": `${eventGapPx}px` });

		const calendarOptions: Calendar.Options = {
			view: "resourceTimelineMonth",
			columnWidth: columnWidthRem + "rem",
			eventGap: eventGapPx,
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
						const todayInDom = container.querySelector<HTMLElement>(".ec-body .ec-today");
						if (todayInDom !== null)
							window.requestAnimationFrame(() => this.scrollToToday(true));
						else
							this.calendar?.gotoDate(new Date());
					}
				}
			},
			dragConstraint: (info) => {
				const placeChanged = info.oldResource !== undefined && info.newResource !== undefined;
				const dateChanged = info.event.start.getTime() !== info.oldEvent.start.getTime();
				return placeChanged && !dateChanged;
			},
			eventDrop: (info) => {
				this.handleEventDrop(info);
			},
			eventResize: (info) => {
				this.handleEventResize(info);
			},
			eventClick: (info) => {
				this.handleEventClick(info);
			}
		};

		this.calendar = createCalendar(container, [ResourceTimeline, Interaction], calendarOptions);

		// Event Calendar ships a dark palette gated on an `.ec-dark` ancestor; keep it in sync with Obsidian's active theme
		const applyEcDarkClass = () => container.toggleClass("ec-dark", document.body.classList.contains("theme-dark"));
		applyEcDarkClass();
		this.registerEvent(this.app.workspace.on("css-change", applyEcDarkClass));

		// Watch for changes in the bookings folder
		if (bookingsFolder !== null) {
			const onMetadataChanged = (file: TFile) => {
				log.view.t();
				if (file.path.startsWith(bookingsFolder.path))
					this.refreshCalendar(bookingsFolder);
			};
			const onFileDeleted = (file: TAbstractFile) => {
				log.view.t();
				if (file.path.startsWith(bookingsFolder.path))
					this.refreshCalendar(bookingsFolder);
			};
			const onFileRenamed = (file: TAbstractFile, oldPath: string) => {
				log.view.t();
				if (file.path.startsWith(bookingsFolder.path) || oldPath.startsWith(bookingsFolder.path))
					this.refreshCalendar(bookingsFolder);
			};

			this.registerEvent(this.app.metadataCache.on("changed", onMetadataChanged));
			this.registerEvent(this.app.vault.on("delete", onFileDeleted));
			this.registerEvent(this.app.vault.on("rename", onFileRenamed));
		}
	}

	private loadPlaces(bookingsFolder: TFolder) {
		const placesFolders = Api.Folder.getChildren(this.app.vault, bookingsFolder.path);
		return placesFolders
			.sort((a, b) => a.name.localeCompare(b.name))
			.map((f) => ({
				id: f.path,
				title: f.name,
			}));
	}

	/**
	 * Loads bookings from the vault as all-day calendar events.
	 * Frontmatter convention: `date` is the check-in day, `endDate` is the
	 * exclusive check-out day (the first day the place is free again). A
	 * booking without `endDate` occupies exactly its `date`.
	 */
	private loadBookings(bookingsFolder: TFolder): Calendar.EventInput[] {
		const placesFolders = Api.Folder.getChildren(this.app.vault, bookingsFolder.path);
		const events: Calendar.EventInput[] = [];

		for (const placeFolder of placesFolders) {
			const files = placeFolder.children.filter(child => Api.File.isMarkdown(child));

			for (const file of files) {
				const cache = this.app.metadataCache.getFileCache(file);
				if (cache === null) {
					log.view.w("No cache found for ", file.path);
					continue;
				}

				const fm: Record<string, unknown> | undefined = cache.frontmatter;
				if (fm === undefined)
					continue;

				const date = fm["date"];
				if (Str.isNonEmpty(date)) {
					let endDate = Str.nonEmpty(fm["endDate"]);
					if (endDate !== undefined && endDate < date) {
						const warning = `Booking "${file.path}": endDate (${endDate}) is before its start date (${date}), ignoring endDate.`;
						log.view.w(warning);
						//new Notice(warning, 0);

						endDate = undefined;
					}

					events.push({
						resourceId: placeFolder.path,
						extendedProps: { file },
						allDay: true,
						start: date,
						end: endDate ?? date,
						title: Str.trimmedNonEmpty(fm["title"]) ?? file.basename,
					});
				}
			}
		}

		return events;
	}

	private refreshCalendar(bookingsFolder: TFolder) {
		if (this.calendar === null)
			return;
		this.calendar.setOption("resources", this.loadPlaces(bookingsFolder));
		this.calendar.setOption("events", this.loadBookings(bookingsFolder));
	}

	private handleEventClick(_info: Calendar.EventClickInfo) {
		log.view.t(_info);
		new Notice("Not done yet")
	}

	private handleEventDrop(info: Calendar.EventDropInfo) {
		const file = info.event.extendedProps["file"];
		if (!Api.File.is(file))
			return;

		const newFolderPath = info.event.resourceIds[0];
		if (!Str.isNonEmpty(newFolderPath))
			return;

		const newPath = `${newFolderPath}/${file.name}`;
		void this.app.fileManager.renameFile(file, newPath);
	}

	private handleEventResize(info: Calendar.EventResizeInfo) {
		const file = info.event.extendedProps["file"];
		if (!Api.File.is(file))
			return;

		const endDate = formatDateOnly(info.event.end);
		void Api.Frontmatter.update(this.app, file, (fm) => {
			fm["endDate"] = endDate;
		});
	}

	private scrollToToday(animate = false) {
		log.view.t();

		const container = this.contentEl;
		const scroller = container.querySelector<HTMLElement>(".ec-main");
		const todayEl = container.querySelector<HTMLElement>(".ec-today");
		if (!scroller || !todayEl)
			return;

		const scrollerRect = scroller.getBoundingClientRect();
		const todayRect = todayEl.getBoundingClientRect();
		const offset = todayRect.left - scrollerRect.left + scroller.scrollLeft;
		const targetScroll = Math.max(0, offset);
		const behavior = animate ? "smooth" : "instant";

		scroller.scrollTo({ left: targetScroll, behavior });
	}

	public override async onClose(): Promise<void> {
		if (this.calendar) {
			await destroyCalendar(this.calendar);
			this.calendar = null;
		}
	}
}
