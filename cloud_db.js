// The Gentlemen Manor - Shared Cloud Database Adapter (Firebase REST)
const FIREBASE_BASE_URL = "https://doppelxp-stream-default-rtdb.europe-west1.firebasedatabase.app";

const CloudDB = {
    // -------------------------------------------------------------
    // UHREN-INVENTAR & TRESOR (SHOWCASE + SPIELER-TRESORE)
    // -------------------------------------------------------------
    async getVaultWatches() {
        try {
            const res = await fetch(`${FIREBASE_BASE_URL}/watches.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();
            if (!data) return [];
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

    // Komplette Spieler-Tresore (welche Uhren-IDs jeder Zuschauer besitzt + Cooldown)
    async getAllWatchVaults() {
        try {
            const res = await fetch(`${FIREBASE_BASE_URL}/watches_vault.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return await res.json() || {};
        } catch (e) {
            console.warn("[CloudDB] Konnte Spieler-Tresore nicht aus Firebase laden:", e);
            return {};
        }
    },

    async getUserWatchVault(username) {
        try {
            const cleanUser = username.toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
            const res = await fetch(`${FIREBASE_BASE_URL}/watches_vault/${encodeURIComponent(cleanUser)}.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return await res.json() || null;
        } catch (e) {
            console.warn("[CloudDB] Konnte Einzel-Tresor nicht laden:", e);
            return null;
        }
    },

    async updateUserWatchVault(username, vaultEntry) {
        try {
            const cleanUser = username.toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
            await fetch(`${FIREBASE_BASE_URL}/watches_vault/${encodeURIComponent(cleanUser)}.json`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    lastDraw: vaultEntry.lastDraw || 0,
                    watches: Array.isArray(vaultEntry.watches) ? vaultEntry.watches : [],
                    updatedAt: Date.now()
                })
            });
        } catch (e) {
            console.warn("[CloudDB] Fehler beim Sichern des Spieler-Tresors in Firebase:", e);
        }
    },

    // -------------------------------------------------------------
    // FASANENJAGD & STASH
    // -------------------------------------------------------------
    async getAllHunters() {
        try {
            const res = await fetch(`${FIREBASE_BASE_URL}/pheasants.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            return await res.json() || {};
        } catch (e) {
            console.warn("[CloudDB] Konnte Jäger-Daten nicht laden:", e);
            return {};
        }
    },

    async getHunterStash(username) {
        try {
            const cleanUser = username.toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
            const res = await fetch(`${FIREBASE_BASE_URL}/pheasants/${encodeURIComponent(cleanUser)}.json`, { cache: 'no-store' });
            if (!res.ok) throw new Error("HTTP error " + res.status);
            const data = await res.json();
            return data || null;
        } catch (e) {
            console.warn("[CloudDB] Konnte Stash nicht laden:", e);
            return null;
        }
    },

    async updateHunterStash(username, stashData) {
        try {
            const cleanUser = username.toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
            await fetch(`${FIREBASE_BASE_URL}/pheasants/${encodeURIComponent(cleanUser)}.json`, {
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
            const cleanUser = username.toLowerCase().trim().replace(/[.#$\[\]\/]/g, '_');
            await fetch(`${FIREBASE_BASE_URL}/watchtime/${encodeURIComponent(cleanUser)}.json`, {
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
