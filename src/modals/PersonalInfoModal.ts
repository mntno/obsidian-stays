import type { PersonalInfo } from "#/person/types";
import { capitalizeWords } from "#/utils/stringUtils";
import { Str } from "#/utils/ts";
import { App, Modal, Setting } from "obsidian";

const Gender = {
	FEMALE: "Female",
	MALE: "Male",
	OTHER: "Other",
} as const;

type Gender = typeof Gender[keyof typeof Gender];

export class PersonalInfoModal extends Modal {

	private resolve?: (value: PersonalInfo | null) => void;
	private didSubmit = false;

	public constructor(app: App) {
		super(app);

		this.setTitle("Personal information");

		new Setting(this.contentEl)
			.setName("First name")
			.addText((text) =>
				text.onChange((value) => {
					this.value.firstName = value;
					this.updateSubmitButtonState();
				}));

		new Setting(this.contentEl)
			.setName("Middle names")
			.setDesc("Separate with a space if more than one.")
			.addText((text) =>
				text.onChange((value) => {
					this.value.middleNames = value.trim().split(/\s+/);
					this.updateSubmitButtonState();
				}));

		new Setting(this.contentEl)
			.setName("Last name")
			.addText((text) =>
				text.onChange((value) => {
					this.value.lastName = value;
					this.updateSubmitButtonState();
				}));

		new Setting(this.contentEl)
			.setName("Gender")
			.addDropdown((dropdown) => {
				dropdown.addOption(Str.empty, Str.empty);
				dropdown.addOption(Gender.FEMALE, Gender.FEMALE);
				dropdown.addOption(Gender.MALE, Gender.MALE);
				dropdown.addOption(Gender.OTHER, Gender.OTHER);
				dropdown.onChange((value) => {
					this.value.gender = value;
					this.updateSubmitButtonState();
				});
			});

		new Setting(this.contentEl)
			.setName("Date of birth")
			.setDesc("Enter the birth date")
			.addText((text) => {
				text.inputEl.type = "date";
				text.onChange((value) => {
					this.value.dateOfBirth = value ? new Date(value) : undefined;
					this.updateSubmitButtonState();
				});
			});

		new Setting(this.contentEl)
			.setName("Monastic")
			.setDesc("Is the person monk, novice, etc.")
			.addToggle((toggle) => {
				toggle.onChange((value) => {
					this.value.isMonastic = value;
				});
			});

		this.nextButton = new Setting(this.contentEl)
			.addButton((submitButton) => {
				submitButton.setButtonText("Next");
				submitButton.setDisabled(true);
				submitButton.setCta();
				submitButton.onClick(() => {
					this.didSubmit = true;
					this.resolveAndClose();
				});
			});
	}

	/**
	 * @returns The entered personal info, or `null` if the modal was cancelled.
	 */
	public onSubmit(): Promise<PersonalInfo | null> {
		return new Promise<PersonalInfo | null>((resolve) => {
			this.resolve = resolve;
			super.open();
		});
	}

	public override onOpen() {
	}

	public override onClose() {
		this.contentEl.empty();
		if (!this.didSubmit) {
			this.resolve?.(null);
		}
	}


	private value: PersonalInfo = {
		firstName: Str.empty,
		middleNames: [],
		lastName: Str.empty,
		isMonastic: false,
	};

	private nextButton!: Setting;

	private resolveAndClose() {
		this.value.fullName = this.fullName() ?? undefined;
		this.resolve?.(this.value);
		this.close();
	}

	private fullName() {
		const parts = [this.value.firstName, ...this.value.middleNames, this.value.lastName]
			.map(name => name.trim())
			.filter(Boolean);
		const fullName = parts.join(" ");
		return fullName.length > 0 ? capitalizeWords(fullName) : null;
	}

	private updateSubmitButtonState() {
		if (this.value.gender && this.value.firstName.trim().length > 0)
			this.nextButton.setDisabled(false);
		else
			this.nextButton.setDisabled(true);
	}
}
