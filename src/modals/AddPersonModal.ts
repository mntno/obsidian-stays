import { App, MarkdownView, Modal, Setting, type TFile } from "obsidian";
import type { AddPersonResult, PersonalInfo } from "#/person/types";
import { createPersonNote } from "#/person/PersonNote";
import { capitalizeWords } from "#/utils/stringUtils";
import { Str } from "#/utils/ts";
import { log } from "#/utils/logger";

const Gender = {
	FEMALE: "Female",
	MALE: "Male",
	OTHER: "Other",
} as const;

type Gender = typeof Gender[keyof typeof Gender];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class AddPersonModal extends Modal {

	private personalInfo: PersonalInfo = {
		firstName: Str.empty,
		middleNames: [],
		lastName: Str.empty,
		isMonastic: false,
	};

	private fullAddress: string = Str.empty;
	private email: string = Str.empty;
	private phone: string = Str.empty;
	private notes: string = Str.empty;

	private emailSetting!: Setting;
	private createButton!: Setting;

	private readonly peopleFolder: string;
	private readonly onSubmit: (result: AddPersonResult) => void;

	public constructor(
		app: App,
		peopleFolder: string,
		onSubmit: (result: AddPersonResult) => void,
	) {
		super(app);
		this.peopleFolder = peopleFolder;
		this.onSubmit = onSubmit;
		this.setTitle("Add a person");

		new Setting(this.contentEl)
			.setName("First name")
			.addText((text) =>
				text.onChange((value) => {
					this.personalInfo.firstName = value;
					this.updateCreateButtonState();
				}));

		new Setting(this.contentEl)
			.setName("Middle names")
			.setDesc("Separate with a space if more than one.")
			.addText((text) =>
				text.onChange((value) => {
					this.personalInfo.middleNames = value.trim().split(/\s+/);
				}));

		new Setting(this.contentEl)
			.setName("Last name")
			.addText((text) =>
				text.onChange((value) => {
					this.personalInfo.lastName = value;
				}));

		new Setting(this.contentEl)
			.setName("Gender")
			.addDropdown((dropdown) => {
				dropdown.addOption(Str.empty, Str.empty);
				dropdown.addOption(Gender.FEMALE, Gender.FEMALE);
				dropdown.addOption(Gender.MALE, Gender.MALE);
				dropdown.addOption(Gender.OTHER, Gender.OTHER);
				dropdown.onChange((value) => {
					this.personalInfo.gender = value;
					this.updateCreateButtonState();
				});
			});

		new Setting(this.contentEl)
			.setName("Date of birth")
			.setDesc("Enter the birth date")
			.addText((text) => {
				text.inputEl.type = "date";
				text.onChange((value) => {
					this.personalInfo.dateOfBirth = value ? new Date(value) : undefined;
				});
			});

		new Setting(this.contentEl)
			.setName("Monastic")
			.setDesc("Is the person monk, novice, etc.")
			.addToggle((toggle) => {
				toggle.onChange((value) => {
					this.personalInfo.isMonastic = value;
				});
			});

		new Setting(this.contentEl)
			.setName("Full address")
			.addText((text) =>
				text.onChange((value) => {
					this.fullAddress = value;
				}));

		this.emailSetting = new Setting(this.contentEl)
			.setName("Email")
			.addText((text) => {
				text.onChange((value) => {
					this.email = value;
					this.updateCreateButtonState();
				});
				text.inputEl.addEventListener("focus", () => {
					this.emailSetting.setErrorMessage(null);
				});
				text.inputEl.addEventListener("blur", () => {
					this.showEmailError();
				});
			});

		new Setting(this.contentEl)
			.setName("Phone")
			.addText((text) =>
				text.onChange((value) => {
					this.phone = value;
				}));

		new Setting(this.contentEl)
			.setName("Notes")
			.addTextArea((text) => {
				text.inputEl.rows = 3;
				text.onChange((value) => {
					this.notes = value;
				});
			});

		this.createButton = new Setting(this.contentEl)
			.addButton((button) => {
				button.setButtonText("Create");
				button.setDisabled(true);
				button.setCta();
				button.onClick(() => {
					this.handleSubmit().catch(log.catch)
				});
			})
			.addButton((button) => {
				button.setButtonText("Cancel");
				button.onClick(() => {
					this.close();
				});
			});
	}

	public override onOpen() {
	}

	public override onClose() {
		this.contentEl.empty();
	}

	private async handleSubmit() {
		const fullName = this.fullName();
		if (!fullName)
			return;

		const personalInfo: PersonalInfo = {
			...this.personalInfo,
			fullName,
		};

		const result: AddPersonResult = {
			personalInfo,
			fullAddress: Str.nonEmpty(this.fullAddress),
			contact: {
				email: Str.nonEmpty(this.email),
				phone: Str.nonEmpty(this.phone),
				notes: Str.nonEmpty(this.notes),
			},
		};

		const file = await createPersonNote(this.app, this.peopleFolder, result);
		if (!file) {
			result.error = new Error(`A person named "${fullName}" already exists.`);
		} else {
			this.openPersonNote(file);
		}

		this.onSubmit(result);
		this.close();
	}

	private fullName() {
		const parts = [this.personalInfo.firstName, ...this.personalInfo.middleNames, this.personalInfo.lastName]
			.map(name => name.trim())
			.filter(Boolean);
		const fullName = parts.join(" ");
		return fullName.length > 0 ? capitalizeWords(fullName) : null;
	}

	private updateCreateButtonState() {
		if (this.personalInfo.gender && this.personalInfo.firstName.trim().length > 0 && this.isEmailValid())
			this.createButton.setDisabled(false);
		else
			this.createButton.setDisabled(true);
	}

	private isEmailValid(): boolean {
		const trimmed = this.email.trim();
		return trimmed.length === 0 || EMAIL_REGEX.test(trimmed);
	}

	private showEmailError() {
		const trimmed = this.email.trim();
		if (trimmed.length > 0 && !EMAIL_REGEX.test(trimmed)) {
			this.emailSetting.setErrorMessage("Invalid email address.");
		} else {
			this.emailSetting.setErrorMessage(null);
		}
	}

	private openPersonNote(file: TFile): void {
		const leaf = this.app.workspace.getLeaf("tab");
		void leaf.openFile(file);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		view?.editor.setCursor(0, 0);
	}
}
