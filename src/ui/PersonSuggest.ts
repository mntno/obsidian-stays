import { Api } from "#/utils/api";
import { Str } from "#/utils/ts";
import { AbstractInputSuggest, App, TFile } from "obsidian";

interface PersonEntry {
	file: TFile;
	name: string;
	info: string;
}

export class PersonSuggest extends AbstractInputSuggest<TFile> {
	private entries: PersonEntry[] = [];
	private enabled = false;
	private readonly inputEl: HTMLInputElement;
	private readonly peopleFolder: string;
	private readonly onPersonSelected: (file: TFile) => void;

	public constructor(
		app: App,
		inputEl: HTMLInputElement,
		peopleFolder: string,
		onPersonSelected: (file: TFile) => void,
	) {
		super(app, inputEl);
		this.inputEl = inputEl;
		this.peopleFolder = peopleFolder;
		this.onPersonSelected = onPersonSelected;
		this.loadEntries();
	}

	public enable(): void {
		this.enabled = true;
	}

	public getSuggestions(query: string): TFile[] {
		if (!this.enabled)
			return [];

		const lower = query.toLowerCase();
		return this.entries
			.filter((e) => e.name.toLowerCase().contains(lower) || e.info.toLowerCase().contains(lower))
			.map((e) => e.file);
	}

	public renderSuggestion(file: TFile, el: HTMLElement): void {
		const entry = this.entries.find((e) => e.file === file);
		const name = entry !== undefined && Str.isNonEmpty(entry.name) ? entry.name : file.basename;
		const info = entry !== undefined ? entry.info : undefined;
		el.setText(info ? `${name} (${info})` : name);
	}

	public override selectSuggestion(file: TFile): void {
		const entry = this.entries.find((e) => e.file === file);
		this.inputEl.value = entry !== undefined ? entry.name : file.basename;
		this.inputEl.trigger("input");
		this.onPersonSelected(file);
		this.close();
	}

	private loadEntries(): void {
		const folder = Api.Folder.get(this.app.vault, this.peopleFolder);
		if (!folder)
			return;

		this.entries = folder.children
			.filter(Api.File.isMarkdown)
			.map((file) => {
				const fm: Record<string, unknown> | undefined = this.app.metadataCache.getFileCache(file)?.frontmatter;
				const name = Str.trimmedNonEmpty(fm?.["name"]) ?? file.basename;
				const info = Str.nonEmpty(fm?.["info"]) ?? Str.empty;
				return { file, name, info };
			})
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}
