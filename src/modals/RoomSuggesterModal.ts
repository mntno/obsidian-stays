import { App, SuggestModal, TFolder } from "obsidian";

export class RoomSuggesterModal extends SuggestModal<TFolder> {

	private rooms: TFolder[] = [];
	private didChoose = false;
	private resolve?: (value: TFolder | null) => void;

	public constructor(
		app: App,
		private readonly bookingsFolder: string,
	) {
		super(app);
		this.setPlaceholder("Select room");
	}

	/**
	 * @returns The selected room `TFolder`, or `null` if cancelled.
	 */
	public onSubmit(): Promise<TFolder | null> {
		return new Promise<TFolder | null>((resolve) => {
			this.resolve = resolve;
			this.loadRooms();
			super.open();
		});
	}

	public override selectSuggestion(value: TFolder, evt: MouseEvent | KeyboardEvent): void {
		this.didChoose = true;
		super.selectSuggestion(value, evt);
	}

	public override getSuggestions(query: string): TFolder[] {
		const lower = query.toLowerCase();
		return this.rooms.filter((r) => r.name.toLowerCase().includes(lower));
	}

	public override renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.name);
	}

	public override onChooseSuggestion(folder: TFolder): void {
		this.resolve?.(folder);
	}

	public override onClose(): void {
		this.contentEl.empty();
		if (!this.didChoose) {
			this.resolve?.(null);
		}
	}


	private loadRooms(): void {
		const abstract = this.app.vault.getAbstractFileByPath(this.bookingsFolder);
		if (!(abstract instanceof TFolder))
			return;

		this.rooms = abstract.children
			.filter((child): child is TFolder => child instanceof TFolder)
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}
