/**
 * Date → unix seconds, using FLOAT's locked deadline semantics:
 * end of the selected day (23:59:59) in the creator's local timezone.
 *
 * The UI collects a bare "YYYY-MM-DD" with no time and no zone, while the
 * contracts compare against unix seconds. Resolving that here, once,
 * server-side keeps every caller consistent — and the IANA zone is stored
 * alongside so the value can be rendered back in the zone it was chosen in.
 */
export function endOfDayUnix(date, timeZone) {
    const [year, month, day] = date.split("-").map(Number);
    if (!year || !month || !day) {
        throw new Error(`Invalid date: ${date}`);
    }
    // Start from the wall-clock instant as if it were UTC, then correct by the
    // zone's offset at that moment (which accounts for DST).
    const naiveUtc = Date.UTC(year, month - 1, day, 23, 59, 59);
    const offsetMs = zoneOffsetMs(new Date(naiveUtc), timeZone);
    return Math.floor((naiveUtc - offsetMs) / 1000);
}
/** Offset in ms between the given zone and UTC at a specific instant. */
function zoneOffsetMs(at, timeZone) {
    try {
        const formatter = new Intl.DateTimeFormat("en-US", {
            timeZone,
            hour12: false,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const parts = Object.fromEntries(formatter.formatToParts(at).map((p) => [p.type, p.value]));
        const asUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour === "24" ? "0" : parts.hour), Number(parts.minute), Number(parts.second));
        return asUtc - at.getTime();
    }
    catch {
        // Unknown zone — fall back to UTC rather than silently shifting the
        // deadline by an arbitrary amount.
        return 0;
    }
}
//# sourceMappingURL=time.js.map