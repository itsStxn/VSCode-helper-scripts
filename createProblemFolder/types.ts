export interface ExitHandle {
	ok: () => Promise<void>;
	bad: () => Promise<void>;
}
