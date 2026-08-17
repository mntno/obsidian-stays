import { App, stringifyYaml, TFile } from "obsidian";
import { formatDate } from "#/utils/date";
import { Str } from "#/utils/ts";
import type { AddBookingResult } from "#/booking/types";

const QUERIES_MD_PATH = "Assets/Datacore/Queries.md";

export function deriveRoomCode(roomName: string): string {
	return roomName.split(" ").map((w) => w[0]).join("").toUpperCase();
}

export function formatDateOnly(date: Date): string {
	const pad = (n: number): string => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildFrontmatter(result: AddBookingResult, created: Date = new Date()): Record<string, unknown> {
	const { bookingInfo, roomName } = result;
	if (!bookingInfo || !roomName)
		throw new Error("Missing booking info to build the booking note.");

	return {
		created: formatDate(created),
		person: `[[${bookingInfo.personName}]]`,
		applicationForm: bookingInfo.applicationFormUrl ?? Str.empty,
		title: bookingInfo.title,
		allDay: true,
		date: formatDateOnly(bookingInfo.date),
		endDate: bookingInfo.endDate ? formatDateOnly(bookingInfo.endDate) : undefined,
		completed: null,
	};
}

function buildBody(result: AddBookingResult): string {
	const { bookingInfo } = result;
	if (!bookingInfo)
		throw new Error("Missing booking info to build the booking note.");

	let body = `# ${bookingInfo.personName}


## Booking Details

> [!NOTE] 
`;

	if (bookingInfo.applicationFormUrl) {
		body += `

## Application Form

\`\`\`datacorejsx
const { RenderGoogleForm } = await dc.require(dc.headerLink("${QUERIES_MD_PATH}", "Queries"));
return <RenderGoogleForm />;
\`\`\`
`;
	}

	return body;
}

function buildBookingNoteContent(result: AddBookingResult, created: Date = new Date()): string {
	return `---\n${stringifyYaml(buildFrontmatter(result, created))}---\n\n${buildBody(result)}`;
}

function bookingFileName(result: AddBookingResult): string {
	const { bookingInfo } = result;
	if (!bookingInfo)
		throw new Error("Missing booking info to build the booking note.");
	return `${formatDateOnly(bookingInfo.date)} ${bookingInfo.personName}.md`;
}

function bookingNotePath(bookingsFolder: string, roomName: string, result: AddBookingResult): string {
	return `${bookingsFolder}/${roomName}/${bookingFileName(result)}`;
}

export async function createBookingNote(
	app: App,
	bookingsFolder: string,
	roomName: string,
	result: AddBookingResult,
): Promise<TFile | null> {
	const path = bookingNotePath(bookingsFolder, roomName, result);
	if (app.vault.getAbstractFileByPath(path)) {
		return null;
	}
	return app.vault.create(path, buildBookingNoteContent(result));
}
