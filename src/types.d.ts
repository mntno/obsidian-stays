declare module "@event-calendar/core" {
    export default class Calendar {
        constructor(options: {
            target: HTMLElement;
            props: {
                plugins: unknown[];
                options: Record<string, unknown>;
            };
        });

        setOption(name: string, value: unknown): void;
        $destroy(): void;
    }
}

declare module "@event-calendar/resource-timeline" {
    const ResourceTimeline: unknown;
    export default ResourceTimeline;
}

declare module "@event-calendar/interaction" {
    const Interaction: unknown;
    export default Interaction;
}
