type DynamicRoutes = {
	
};

type Layouts = {
	"/": undefined
};

export type RouteId = "/";

export type RouteParams<T extends RouteId> = T extends keyof DynamicRoutes ? DynamicRoutes[T] : Record<string, never>;

export type LayoutParams<T extends RouteId> = Layouts[T] | Record<string, never>;

export type Pathname = "/";

export type ResolvedPathname = `${"" | `/${string}`}${Pathname}`;

export type Asset = "/.DS_Store" | "/How to Transfer Content Using VaultSync.mp4" | "/apple-touch-icon.png" | "/build-in_compliance.png" | "/download-icon.png" | "/earn-more-from-every-video.png" | "/favicon.png" | "/glow.png" | "/icon1.png" | "/icon2.png" | "/icon3.png" | "/icon4.png" | "/icon5.png" | "/icon6.png" | "/icon7.png" | "/icon8.png" | "/icon9.png" | "/novavault-logo.png" | "/pixel-perfect_transfers.png" | "/vaultVars.json" | "/vaultsync-token-logo.png";