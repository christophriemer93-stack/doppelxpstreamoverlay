// The Gentlemen Manor - Shared Cloud Database Adapter (Firebase REST)
const FIREBASE_BASE_URL = "https://doppelxp-stream-default-rtdb.europe-west1.firebasedatabase.app";

const CloudDB = {
    // -------------------------------------------------------------
    // UHREN-INVENTAR & TRESOR
    // -------------------------------------------------------------
    async getVaultWatches() {
        try {
            const res = await fetch(`${FIREBASE_BASE_URL}/watches.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();
            if (!data) return [];
            // Wandelt Object in Array um
            return Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();
        } catch (e) {
            console.warn("[CloudDB] Konnte Uhren nicht aus Firebase laden (Fallback):", e);
            return null;
        }
    },

    async saveWatch(watchData) {
        try {
            const res = await fetch(`${FIREBASE_BASE_URL}/watches.json`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...watchData,
                    timestamp: Date.now()
                })
            });
            return await res.json();
        } catch (e) {
            console.warn("[CloudDB] Fehler beim Speichern der Uhr in Firebase:", e);
        }
    },

    // -------------------------------------------------------------
    // FASANENJAGD & STASH
    // -------------------------------------------------------------
    async getHunterStash(username) {
        try {
            const cleanUser = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
            const res = await fetch(`${FIREBASE_BASE_URL}/pheasants/${cleanUser}.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();
            return data || { hits: 0, shots: 0, royal: 0 };
        } catch (e) {
            console.warn("[CloudDB] Konnte Stash nicht laden:", e);
            return { hits: 0, shots: 0, royal: 0 };
        }
    },

    async updateHunterStash(username, stashData) {
        try {
            const cleanUser = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
            await fetch(`${FIREBASE_BASE_URL}/pheasants/${cleanUser}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...stashData,
                    lastActive: Date.now()
                })
            });
        } catch (e) {
            console.warn("[CloudDB] Fehler beim Aktualisieren des Stashs:", e);
        }
    },

    // -------------------------------------------------------------
    // WATCHTIME & SALON-LEDGER (AHNENGALERIE)
    // -------------------------------------------------------------
    async getWatchtimeData() {
        try {
            const res = await fetch(`${FIREBASE_BASE_URL}/watchtime.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return await res.json() || {};
        } catch (e) {
            console.warn("[CloudDB] Konnte Watchtime nicht aus Firebase laden:", e);
            return {};
        }
    },

    async updateWatchtime(username, minutes, displayName) {
        try {
            const cleanUser = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
            await fetch(`${FIREBASE_BASE_URL}/watchtime/${cleanUser}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    displayName: displayName || username,
                    minutes: minutes,
                    lastSeen: Date.now()
                })
            });
        } catch (e) {
            console.warn("[CloudDB] Fehler beim Sichern der Watchtime:", e);
        }
    }
};

window.CloudDB = CloudDB;
