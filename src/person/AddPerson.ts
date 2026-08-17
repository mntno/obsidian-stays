import { App, MarkdownView, type TFile } from "obsidian";
import { PersonalInfoModal } from "#/modals/PersonalInfoModal";
import { PromptModal } from "#/modals/PromptModal";
import { createPersonNote } from "#/person/PersonNote";
import { toCamelCase } from "#/utils/stringUtils";
import type { AddPersonResult, Contact } from "#/person/types";

export class AddPerson {

	public constructor(
		private readonly app: App,
		private readonly peopleFolder: string,
	) { }

	public async run(): Promise<AddPersonResult> {
		const personalInfo = await new PersonalInfoModal(this.app).onSubmit();
		if (!personalInfo?.fullName || !personalInfo.gender) {
			return { didCancel: true };
		}

		const fullAddress = await new PromptModal(this.app, "Full address").onSubmit();
		if (fullAddress === null) {
			return { didCancel: true };
		}

		const contactRaw = await new PromptModal(
			this.app,
			"Contact info (enter to the right of each : on the same line)",
			"Email: \nPhone: \nNotes: ",
			true,
		).onSubmit();
		if (contactRaw === null) {
			return { didCancel: true };
		}
		const contact = this.parseKeyValueString(contactRaw);

		const result: AddPersonResult = {
			didCancel: false,
			personalInfo,
			fullAddress,
			contact,
		};

		const file = await createPersonNote(this.app, this.peopleFolder, result);
		if (!file) {
			return {
				...result,
				error: new Error(`A person named "${personalInfo.fullName}" already exists.`),
			};
		}

		this.openPersonNote(file);
		return result;
	}

	/**
	 * Function to parse the string into an object.
	 * @author ChatGPT
	 */
	private parseKeyValueString(str: string): Contact {
		const obj: Record<string, string | undefined> = {};
		const lines = str.split("\n");

		lines.forEach((line) => {
			const [key, value] = line.split(":").map(item => item.trim());
			if (!key)
				return;
			obj[toCamelCase(key)] = value;
		});

		return obj;
	}

	private openPersonNote(file: TFile): void {
		const leaf = this.app.workspace.getLeaf("tab");
		void leaf.openFile(file);
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		view?.editor.setCursor(0, 0);
	}
}
