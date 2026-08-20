import { App, MarkdownView, Modal, Setting, TextComponent, ButtonComponent, type TFile, type TFolder } from "obsidian";
import type { AddBookingResult, BookingInfo } from "#/booking/types";
import { createBookingNote, derivePlaceCode, formatDateOnly } from "#/booking/BookingNote";
import { PersonSuggest } from "#/ui/PersonSuggest";
import { PlaceSuggest } from "#/ui/PlaceSuggest";
import { Str } from "#/utils/ts";
import { log } from "#/utils/logger";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class AddBookingModal extends Modal {

	private selectedPersonFile: TFile | null = null;
	private selectedPlaceFolder: TFolder | null = null;
	private personName: string = Str.empty;
	private titleManuallyEdited = false;
	private ignoreOnChange = false;

	private titleComponent!: TextComponent;
	private startDateComponent!: TextComponent;
	private endDateComponent!: TextComponent;
	private applicationFormUrlComponent!: TextComponent;

	private createButtonComponent!: ButtonComponent;
	private endDateSetting!: Setting;
	private personSuggest!: PersonSuggest;

	private readonly peopleFolder: string;
	private readonly bookingsFolder: string;
	private readonly onSubmit: (result: AddBookingResult) => void;

	public constructor(
		app: App,
		peopleFolder: string,
		bookingsFolder: string,
		onSubmit: (result: AddBookingResult) => void,
	) {
		super(app);
		this.peopleFolder = peopleFolder;
		this.bookingsFolder = bookingsFolder;
		this.onSubmit = onSubmit;
		this.setTitle("Add a booking");

		new Setting(this.contentEl)
			.setName("Person")
			.addText((text) => {
				text.setPlaceholder("Search person...");
				this.personSuggest = new PersonSuggest(this.app, text.inputEl, this.peopleFolder, (file) => {
					this.selectedPersonFile = file;
					const name = this.getPersonName(file);
					this.personName = name !== null ? name : file.basename;
					this.updateTitle();
					this.updateCreateButtonState();
				});
				text.onChange(() => {
					this.selectedPersonFile = null;
					this.personName = Str.empty;
					this.updateTitle();
					this.updateCreateButtonState();
				});
			});

		new Setting(this.contentEl)
			.setName("Place")
			.addText((text) => {
				text.setPlaceholder("Search place...");
				new PlaceSuggest(this.app, text.inputEl, this.bookingsFolder, (folder) => {
					this.selectedPlaceFolder = folder;
					this.updateTitle();
					this.updateCreateButtonState();
				});
				text.onChange(() => {
					this.selectedPlaceFolder = null;
					this.updateTitle();
					this.updateCreateButtonState();
				});
			});

		new Setting(this.contentEl)
			.setName("Title")
			.setDesc("Title of event in calendar")
			.addText((text) => {
				this.titleComponent = text;
				text.onChange(() => {
					if (!this.ignoreOnChange)
						this.titleManuallyEdited = true;
					this.updateCreateButtonState();
				});
			});

		const today = formatDateOnly(new Date());

		new Setting(this.contentEl)
			.setName("Start date")
			.addText((text) => {
				this.startDateComponent = text;
				text.inputEl.type = "date";
				text.setValue(today);
				text.onChange(() => {
					this.showEndDateError();
					this.updateCreateButtonState();
				});
			});

		this.endDateSetting = new Setting(this.contentEl)
			.setName("End date")
			.addText((text) => {
				this.endDateComponent = text;
				text.inputEl.type = "date";
				text.setValue(this.addDays(today, 1));
				text.onChange(() => {
					this.showEndDateError();
					this.updateCreateButtonState();
				});
				text.inputEl.addEventListener("focus", () => {
					this.endDateSetting.setErrorMessage(null);
				});
				text.inputEl.addEventListener("blur", () => {
					this.showEndDateError();
				});
			});

		new Setting(this.contentEl)
			.setName("Application form URL")
			.setDesc("Optional link to application form")
			.addText((text) => {
				this.applicationFormUrlComponent = text;
			});

		new Setting(this.contentEl)
			.addButton((button) => {
				this.createButtonComponent = button;
				button.setButtonText("Create");
				button.setCta();
				button.onClick(() => {
					this.handleSubmit().catch(log.catch);
				});
			})
			.addButton((button) => {
				button.setButtonText("Cancel");
				button.onClick(() => {
					this.close();
				});
			});

		this.updateCreateButtonState();
	}

	public override onOpen() {
		// Avoid immediate dropdown when modal opens
		window.requestAnimationFrame(() => {
			this.personSuggest.enable();
		});
	}

	public override onClose() {
		this.contentEl.empty();
	}

	private async handleSubmit() {
		if (!this.selectedPersonFile || !this.selectedPlaceFolder)
			return;

		const personName = this.personName;
		const placeName = this.selectedPlaceFolder.name;

		const startDateStr = this.startDateComponent.getValue();
		if (!Str.isNonEmpty(startDateStr) || !this.validateDate(startDateStr))
			return;
		const date = new Date(startDateStr);

		const endDateStr = this.endDateComponent.getValue();
		let endDate: Date | undefined;
		if (Str.isNonEmpty(endDateStr)) {
			if (!this.validateDate(endDateStr))
				return;
			endDate = new Date(endDateStr);
			if (endDateStr <= startDateStr) {
				this.endDateSetting.setErrorMessage("End date must not be before start date.");
				return;
			}
		}

		const applicationFormUrl = this.applicationFormUrlComponent.getValue();
		if (Str.isNonEmpty(applicationFormUrl) && !this.validateUrl(applicationFormUrl))
			return;

		const trimmedTitle = Str.trimmedNonEmpty(this.titleComponent.getValue());
		const title = trimmedTitle !== undefined ? trimmedTitle : `${personName} (${derivePlaceCode(placeName)})`;

		const bookingInfo: BookingInfo = {
			personName,
			personFile: this.selectedPersonFile,
			title,
			date,
			endDate,
			applicationFormUrl: Str.nonEmpty(applicationFormUrl),
		};

		const result: AddBookingResult = {
			bookingInfo,
			placeName,
			placeFolder: this.selectedPlaceFolder,
		};

		const file = await createBookingNote(this.app, this.bookingsFolder, placeName, result);
		if (!file) {
			result.error = new Error(`A booking for "${personName}" on "${startDateStr}" already exists in ${placeName}.`);
		} else {
			this.openBookingNote(file);
		}

		this.onSubmit(result);
		this.close();
	}

	private updateTitle() {
		if (this.titleManuallyEdited || !this.selectedPlaceFolder || !Str.isNonEmpty(this.personName))
			return;
		const placeCode = derivePlaceCode(this.selectedPlaceFolder.name);
		this.ignoreOnChange = true;
		this.titleComponent.setValue(`${this.personName} (${placeCode})`);
		this.ignoreOnChange = false;
		this.titleManuallyEdited = false;
	}

	private updateCreateButtonState() {
		const hasValidStartDate = Str.isNonEmpty(this.startDateComponent.getValue()) && this.validateDate(this.startDateComponent.getValue());
		const hasValidEndDate = this.isEndDateValid();
		const hasTitle = Str.isTrimmedNonEmpty(this.titleComponent.getValue());
		this.createButtonComponent.setDisabled(!(this.selectedPersonFile && this.selectedPlaceFolder && hasValidStartDate && hasValidEndDate && hasTitle));
	}

	private isEndDateValid(): boolean {
		const endStr = this.endDateComponent.getValue();
		if (!Str.isNonEmpty(endStr) || !this.validateDate(endStr))
			return true;
		const startStr = this.startDateComponent.getValue();
		if (!Str.isNonEmpty(startStr) || !this.validateDate(startStr))
			return false;
		return endStr > startStr;
	}

	private getPersonName(file: TFile): string | null {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const name = Str.trimmedNonEmpty(fm?.["name"]);
		return name !== undefined ? name : null;
	}

	private validateDate(dateString: string): boolean {
		if (!DATE_REGEX.test(dateString))
			return false;
		const d = new Date(dateString);
		return !Number.isNaN(d.getTime());
	}

	private validateUrl(url: string): boolean {
		try {
			return !!new URL(url);
		} catch {
			return false;
		}
	}

	private addDays(dateStr: string, days: number): string {
		const d = new Date(dateStr);
		d.setDate(d.getDate() + days);
		return formatDateOnly(d);
	}

	private showEndDateError() {
		const startStr = this.startDateComponent.getValue();
		const endStr = this.endDateComponent.getValue();
		if (Str.isNonEmpty(endStr) && this.validateDate(endStr)
			&& Str.isNonEmpty(startStr) && this.validateDate(startStr)
			&& endStr <= startStr) {
			this.endDateSetting.setErrorMessage("End date must not be before start date.");
		} else {
			this.endDateSetting.setErrorMessage(null);
		}
	}

	private openBookingNote(file: TFile): void {
		const leaf = this.app.workspace.getLeaf("tab");
		void leaf.openFile(file);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		view?.editor.setCursor(0, 0);
	}
}
