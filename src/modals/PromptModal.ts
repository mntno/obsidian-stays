import { App, Modal, Setting } from "obsidian";
import { Str } from "#/utils/ts";

export class PromptModal extends Modal {

	private resolve?: (value: string | null) => void;
	private didSubmit = false;

	public constructor(
		app: App,
		private readonly title: string,
		private readonly defaultValue: string = Str.empty,
		private readonly multiline: boolean = false,
	) {
		super(app);
		this.setTitle(title);
	}

	/**
	 * @returns The entered value, or `null` if the prompt was cancelled.
	 */
	public onSubmit(): Promise<string | null> {
		return new Promise<string | null>((resolve) => {
			this.resolve = resolve;
			super.open();
		});
	}

	public override onOpen() {
		let value = this.defaultValue;

		const setting = new Setting(this.contentEl);
		if (this.multiline) {
			setting.addTextArea((text) => {
				text.inputEl.rows = 5;
				text.setValue(this.defaultValue);
				text.onChange((newValue) => {
					value = newValue;
				});
			});
		} else {
			setting.addText((text) => {
				text.setValue(this.defaultValue);
				text.onChange((newValue) => {
					value = newValue;
				});
			});
		}

		new Setting(this.contentEl)
			.addButton((button) => {
				button.setButtonText("OK");
				button.setCta();
				button.onClick(() => {
					this.didSubmit = true;
					this.resolve?.(value);
					this.close();
				});
			})
			.addButton((button) => {
				button.setButtonText("Cancel");
				button.onClick(() => {
					this.close();
				});
			});
	}

	public override onClose() {
		this.contentEl.empty();
		if (!this.didSubmit) {
			this.resolve?.(null);
		}
	}
}
