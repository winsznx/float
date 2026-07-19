/**
 * Date → unix seconds, using FLOAT's locked deadline semantics:
 * end of the selected day (23:59:59) in the creator's local timezone.
 *
 * The UI collects a bare "YYYY-MM-DD" with no time and no zone, while the
 * contracts compare against unix seconds. Resolving that here, once,
 * server-side keeps every caller consistent — and the IANA zone is stored
 * alongside so the value can be rendered back in the zone it was chosen in.
 */
export declare function endOfDayUnix(date: string, timeZone: string): number;
