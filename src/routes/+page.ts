import type { PageLoad } from './$types';

export const load = (({ url }) => {
    return {
        title: "PulseSync – Your Future, Safely Stored",
        description: "Pulsesync.work is a personal, next‑generation content migration tool designed for effortless data security and future-ready storage.",
        ogTitle: "PulseSync – Your Future, Safely Stored",
        ogDescription: "Pulsesync.work is a personal, next‑generation content migration tool designed for effortless data security and future-ready storage.",
        ogImage: "/pulsesync-og.png",
        canonicalUrl: `https://pulsesync.work${url.pathname}`
    };
}) satisfies PageLoad;