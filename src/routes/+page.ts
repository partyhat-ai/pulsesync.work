import type { PageLoad } from './$types';

export const load = (({ url }) => {
    return {
        title: "Novavault – Your Future, Safely Stored",
        description: "Novavault.me is a personal, next‑generation content migration tool designed for effortless data security and future-ready storage.",
        ogTitle: "Novavault – Your Future, Safely Stored",
        ogDescription: "Novavault.me is a personal, next‑generation content migration tool designed for effortless data security and future-ready storage.",
        ogImage: "/novavault-og.png",
        canonicalUrl: `https://novavault.me${url.pathname}`
    };
}) satisfies PageLoad;