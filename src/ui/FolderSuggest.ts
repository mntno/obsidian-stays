import { Str } from "#/utils/ts";
import { AbstractInputSuggest, App, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
  public constructor(app: App, private inputEl: HTMLInputElement) {
    super(app, inputEl);
  }

  public getSuggestions(query: string): TFolder[] {
    const lower = query.toLowerCase();
    return this.app.vault
      .getAllFolders(false)
      .filter((f) => f.path.toLowerCase().contains(lower));
  }

  public renderSuggestion(folder: TFolder, el: HTMLElement): void {
    el.setText(folder.path === Str.empty ? "/" : folder.path);
  }

  public override selectSuggestion(folder: TFolder): void {
    this.inputEl.value = folder.path;
    this.inputEl.trigger("input");
    this.close();
  }
}
