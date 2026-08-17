import { App, stringifyYaml, type TFile } from "obsidian";
import { formatDate } from "#/utils/date";
import { Str } from "#/utils/ts";
import type { AddPersonResult } from "#/person/types";

const QUERIES_MD_PATH = "Assets/Datacore/Queries.md";

function buildFrontmatter(result: AddPersonResult, created: Date = new Date()): Record<string, unknown> {
	const { personalInfo } = result;
	if (!personalInfo?.fullName)
		throw new Error("Missing personal info to build the person note.");

	return {
		addressFull: result.fullAddress ?? Str.empty,
		created: formatDate(created),
		dateOfBirth: personalInfo.dateOfBirth && !Number.isNaN(personalInfo.dateOfBirth.getTime())
			? personalInfo.dateOfBirth.toISOString().split("T")[0]
			: Str.empty,
		email: result.contact?.email ?? Str.empty,
		gender: personalInfo.gender,
		info: result.contact?.notes ?? Str.empty,
		isMember: false,
		memberOkToContact: false,
		name: personalInfo.fullName,
		phone: result.contact?.phone ?? Str.empty,
		tags: [`person/${personalInfo.isMonastic ? "monastic" : "guest"}`],
	};
}

function buildBody(result: AddPersonResult): string {
	const { personalInfo } = result;
	if (!personalInfo?.fullName)
		throw new Error("Missing personal info to build the person note.");

	return `# ${personalInfo.fullName}


## Bookings

\`\`\`datacorejsx
const { BookingsByPerson } = await dc.require(dc.headerLink("${QUERIES_MD_PATH}", "Queries"));
return <BookingsByPerson />
\`\`\`

## Remarks

> [!note] Add any additional information about ${personalInfo.firstName}.

## Emergancy Contact

> [!note] Add emergency contact for ${personalInfo.firstName}.
`;
}

function buildPersonNoteContent(result: AddPersonResult, created: Date = new Date()): string {
	return `---\n${stringifyYaml(buildFrontmatter(result, created))}---\n\n${buildBody(result)}`;
}

function personNotePath(peopleFolder: string, result: AddPersonResult): string {
	const fullName = result.personalInfo?.fullName;
	if (!fullName)
		throw new Error("Missing personal info to build the person note.");
	return `${peopleFolder}/${fullName}.md`;
}

export async function createPersonNote(app: App, peopleFolder: string, result: AddPersonResult): Promise<TFile | null> {
	const path = personNotePath(peopleFolder, result);
	if (app.vault.getAbstractFileByPath(path)) {
		return null;
	}
	return app.vault.create(path, buildPersonNoteContent(result));
}
