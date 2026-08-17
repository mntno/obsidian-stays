import { vi } from "vitest";

// The Obsidian runtime is unavailable in a Node test environment, so the
// Obsidian API used by `src/main.ts` is mocked. Add any other Obsidian API
// members the plugin under test imports.
vi.mock("obsidian", () => ({
	App: class App {},

	Component: class Component {
		addChild() {}
		registerDomEvent() {}
		registerInterval() {}
		register() {}
		load() {}
		unload() {}
		onload() {}
		onunload() {}
	},

	Editor: class Editor {},

	ItemView: class ItemView {
	 getViewType() { return ""; }
	 getDisplayText() { return ""; }
	},

	MarkdownView: class MarkdownView {},

	Modal: class Modal {
		constructor(_app: unknown) {}
		open() {}
		close() {}
		onOpen() {}
		onClose() {}
	},

	SuggestModal: class SuggestModal {
		constructor(_app: unknown) {}
		setPlaceholder(_placeholder: string) {}
		open() {}
		close() {}
		onOpen() {}
		onClose() {}
		getItems() { return []; }
		getItemText(_item: unknown) { return ""; }
		onChooseItem(_item: unknown) {}
		getSuggestions(_query: string) { return []; }
		renderSuggestion(_item: unknown, _el: HTMLElement) {}
		onChooseSuggestion(_item: unknown) {}
	},

	TFile: class TFile {
		path = "";
		basename = "";
	},

	TFolder: class TFolder {
		children: unknown[] = [];
		name = "";
	},

	Notice: class Notice {},

	Plugin: class Plugin {
		app: Record<string, unknown> = {};
		manifest: Record<string, unknown> = {};

		addRibbonIcon() { return { addClass() {} }; }
		addStatusBarItem() { return { setText() {} }; }
		addCommand() {}
		addSettingTab() {}
		registerView() {}
		registerDomEvent() {}
		registerInterval() {}
		registerEvent() {}
		register() {}
		loadData() { return null; }
		saveData() {}
	},

	PluginSettingTab: class PluginSettingTab {
		app: unknown;
		plugin: unknown;

		constructor(app: unknown, plugin: unknown) {
			this.app = app;
			this.plugin = plugin;
		}
	},

	Setting: class Setting {
		constructor(_containerEl: unknown) {}

		setName() { return this; }
		setDesc() { return this; }
		setPlaceholder() { return this; }
		setValue() { return this; }
		onChange() { return this; }
		addText() { return this; }
		addTextArea() { return this; }
		addDropdown() { return this; }
		addToggle() { return this; }
		addButton() { return this; }
		setDisabled() { return this; }
		setCta() { return this; }
	},

	Platform: { isMobile: false, isDesktop: true },

	stringifyYaml: (obj: unknown) => JSON.stringify(obj),

	normalizePath: (path: string) => path,

	apiVersion: "1.0.0",

	WorkspaceLeaf: class WorkspaceLeaf {},

	TAbstractFile: class TAbstractFile {},

	ConfirmationModal: class ConfirmationModal extends (class {} ) {
		constructor(_app: unknown) { super(); }
		open() {}
		close() {}
	},

	AbstractInputSuggest: class AbstractInputSuggest<_T> {
		constructor(_app: unknown, _inputEl: unknown) {}
		open() {}
		close() {}
	},

	ExtraButtonComponent: class ExtraButtonComponent {
		constructor(_containerEl: unknown) {}
		setIcon() { return this; }
		setTooltip() { return this; }
		setOnClick() { return this; }
	},

	TextComponent: class TextComponent {
		constructor(_containerEl: unknown) {}
		setPlaceholder() { return this; }
		setValue() { return this; }
		onChange() { return this; }
	},

	SettingDefinitionItem: class SettingDefinitionItem {},
}));
