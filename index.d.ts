export interface GridProOptions {
    debounce?: number;
    autoObserve?: boolean;
}

export interface GridProAppliedDetail {
    columns: number;
    template: string;
    collapsed: boolean;
}

declare const GridPro: {
    apply(el: HTMLElement): void;
    init(el: HTMLElement, options?: GridProOptions): void;
};

export default GridPro;
export { GridPro };
