export const PLUGIN_NAME = "Stays";
export const PLUGIN_MENY_SECTION = "stays";

export const Icon = {
	Main: "tent",

	Action: {
		ADD: "plus",
		ADD_USER: "user-plus",
		ADD_BOOKING: "calendar-plus",
		EDIT: "pencil",
		DELETE: "trash",
		COPY: "copy",
	} as const,

	View: {
		Timeline: "timeline",
	} as const,

} as const;
