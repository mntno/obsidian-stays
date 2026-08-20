import { Api } from "#/utils/api";
import { AbstractInputSuggest, App, TFolder } from "obsidian";

export class PlaceSuggest extends AbstractInputSuggest<TFolder> {
	private places: TFolder[] = [];
	private readonly inputEl: HTMLInputElement;
	private readonly bookingsFolder: string;
	private readonly onPlaceSelected: (folder: TFolder) => void;

	public constructor(
		app: App,
		inputEl: HTMLInputElement,
		bookingsFolder: string,
		onPlaceSelected: (folder: TFolder) => void,
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.bookingsFolder = bookingsFolder;
		this.onPlaceSelected = onPlaceSelected;
		this.loadPlaces();
	}

	public getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		return this.places.filter((p) => p.name.toLowerCase().contains(lower));
	}

	public renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.name);
	}

	public override selectSuggestion(folder: TFolder): void {
		this.inputEl.value = folder.name;
		this.inputEl.trigger("input");
		this.onPlaceSelected(folder);
		this.close();
	}

	private loadPlaces(): void {
		this.places = Api.Folder.getChildren(this.app.vault, this.bookingsFolder)
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}
