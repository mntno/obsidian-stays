import { App, MarkdownView, type TFile } from "obsidian";
import { PersonSuggesterModal } from "#/modals/PersonSuggesterModal";
import { RoomSuggesterModal } from "#/modals/RoomSuggesterModal";
import { PromptModal } from "#/modals/PromptModal";
import { createBookingNote, deriveRoomCode, formatDateOnly } from "#/booking/BookingNote";
import { Str } from "#/utils/ts";
import type { AddBookingResult, BookingInfo } from "#/booking/types";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class AddBooking {

	public constructor(
		private readonly app: App,
		private readonly peopleFolder: string,
		private readonly bookingsFolder: string,
	) { }

	public async run(): Promise<AddBookingResult> {
		// 1. Pick a person
		const personFile = await new PersonSuggesterModal(this.app, this.peopleFolder).onSubmit();
		if (!personFile)
			return { didCancel: true };

		const personName = this.getPersonName(personFile);
		if (!personName)
			return { didCancel: false, error: new Error(`Could not read the "name" frontmatter for ${personFile.basename}.`) };

		// 2. Pick a room
		const roomFolder = await new RoomSuggesterModal(this.app, this.bookingsFolder).onSubmit();
		if (!roomFolder)
			return { didCancel: true };

		const roomName = roomFolder.name;
		const roomCode = deriveRoomCode(roomName);
		const defaultTitle = `${personName} (${roomCode})`;

		// 3. Title
		const title = await new PromptModal(this.app, "Title of event in calendar", defaultTitle).onSubmit();
		if (title === null)
			return { didCancel: true };

		// 4. Start date
		const today = formatDateOnly(new Date());
		const dateStr = await new PromptModal(this.app, "Start date (YYYY-MM-DD)", today).onSubmit();
		if (dateStr === null || !this.validateDate(dateStr))
			return { didCancel: true };

		const date = new Date(dateStr);

		// 5. End date (optional, defaults to start date)
		const endDateStr = await new PromptModal(this.app, "End date (YYYY-MM-DD)", dateStr).onSubmit();
		if (endDateStr !== null && !this.validateDate(endDateStr))
			return { didCancel: true };

		const endDate = endDateStr ? new Date(endDateStr) : undefined;

		// 6. Application form URL (optional)
		const applicationFormUrl = await new PromptModal(this.app, "Link to application form (optional)").onSubmit();
		if (applicationFormUrl !== null && applicationFormUrl !== Str.empty && !this.validateUrl(applicationFormUrl))
			return { didCancel: true };

		const bookingInfo: BookingInfo = {
			personName,
			personFile,
			title,
			date,
			endDate,
			applicationFormUrl: applicationFormUrl || undefined,
		};

		const result: AddBookingResult = {
			didCancel: false,
			bookingInfo,
			roomName,
			roomFolder,
		};

		// 7. Create the note
		const file = await createBookingNote(this.app, this.bookingsFolder, roomName, result);
		if (!file) {
			return {
				...result,
				error: new Error(`A booking for "${personName}" on "${dateStr}" already exists in ${roomName}.`),
			};
		}

		// 8. Open the note
		this.openBookingNote(file);
		return result;
	}

	private getPersonName(file: TFile): string | null {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter;
		const name = fm?.["name"] as string | undefined;
		return typeof name === "string" && name.trim().length > 0 ? name.trim() : null;
	}

	private validateDate(dateString: string): boolean {
		if (!DATE_REGEX.test(dateString)) {
			return false;
		}
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

	private openBookingNote(file: TFile): void {
		const leaf = this.app.workspace.getLeaf("tab");
		void leaf.openFile(file);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		view?.editor.setCursor(0, 0);
	}
}
