import { Api } from "#/utils/api";
import { AbstractInputSuggest, App, TFolder } from "obsidian";

export class RoomSuggest extends AbstractInputSuggest<TFolder> {
	private rooms: TFolder[] = [];
	private readonly inputEl: HTMLInputElement;
	private readonly bookingsFolder: string;
	private readonly onRoomSelected: (folder: TFolder) => void;

	public constructor(
		app: App,
		inputEl: HTMLInputElement,
		bookingsFolder: string,
		onRoomSelected: (folder: TFolder) => void,
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.bookingsFolder = bookingsFolder;
		this.onRoomSelected = onRoomSelected;
		this.loadRooms();
	}

	public getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		return this.rooms.filter((r) => r.name.toLowerCase().contains(lower));
	}

	public renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.name);
	}

	public override selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.name;
		this.inputEl.trigger("input");
		this.onRoomSelected(folder);
		this.close();
	}

	private loadRooms(): void {
		this.rooms = Api.Folder.getChildren(this.app.vault, this.bookingsFolder)
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}
