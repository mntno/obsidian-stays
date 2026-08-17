import { App, SuggestModal, TFile, TFolder } from "obsidian";
import { Str } from "#/utils/ts";

interface PersonEntry {
	file: TFile;
	name: string;
	info: string;
}

export class PersonSuggesterModal extends SuggestModal<PersonEntry> {

	private entries: PersonEntry[] = [];
	private didChoose = false;
	private resolve?: (value: TFile | null) => void;

	public constructor(
		app: App,
		private readonly peopleFolder: string,
	) {
		super(app);
		this.setPlaceholder("Select person to book for");
	}

	/**
	 * @returns The selected person's `TFile`, or `null` if cancelled.
	 */
	public onSubmit(): Promise<TFile | null> {
		return new Promise<TFile | null>((resolve) => {
			this.resolve = resolve;
			this.loadEntries();
			super.open();
		});
	}

	public override selectSuggestion(value: PersonEntry, evt: MouseEvent | KeyboardEvent): void {
		this.didChoose = true;
		super.selectSuggestion(value, evt);
	}

	public override getSuggestions(query: string): PersonEntry[] {
		const lower = query.toLowerCase();
		return this.entries.filter(
			(e) => e.name.toLowerCase().includes(lower) || e.info.toLowerCase().includes(lower),
		);
	}

	public override renderSuggestion(entry: PersonEntry, el: HTMLElement): void {
		el.setText(entry.info ? `${entry.name} (${entry.info})` : entry.name);
	}

	public override onChooseSuggestion(entry: PersonEntry): void {
		this.resolve?.(entry.file);
	}

	public override onClose(): void {
		this.contentEl.empty();
		if (!this.didChoose) {
			this.resolve?.(null);
		}
	}


	private loadEntries(): void {
		const abstract = this.app.vault.getAbstractFileByPath(this.peopleFolder);
		if (!(abstract instanceof TFolder))
			return;

		const entries: PersonEntry[] = abstract.children
			.filter((child): child is TFile => child instanceof TFile && child.path.endsWith(".md"))
			.map((file) => {
				const fm: Record<string, unknown> | undefined = this.app.metadataCache.getFileCache(file)?.frontmatter;
				const rawName = fm?.["name"];
				const name = typeof rawName === "string" && rawName.length > 0 ? rawName : file.basename;
				const rawInfo = fm?.["info"];
				const info = typeof rawInfo === "string" ? rawInfo : Str.empty;
				return { file, name, info };
			});

		entries.sort((a, b) => a.name.localeCompare(b.name));
		this.entries = entries;
	}
}
