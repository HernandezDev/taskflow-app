const LOCAL_STORAGE_KEY = "taskflow_offline_tasks";

function readCache<T>(): T[] {
	if (typeof window === "undefined") return [];

	try {
		const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
		if (!cached) return [];

		const parsed = JSON.parse(cached);
		return Array.isArray(parsed) ? (parsed as T[]) : [];
	} catch {
		return [];
	}
}

function writeCache<T>(data: T[]): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
	} catch (err) {
		console.error("[offlineTasksStore] sync failed:", err);
	}
}

export const offlineTasksStore = {
	getCached: readCache,
	setCached: writeCache,
};
