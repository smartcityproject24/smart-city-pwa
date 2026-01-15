const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://rgb.kg:17021";
const API_BASE_V1_URL = `${BASE_URL}/smart-city/api/v1`;

export const API_CONFIG = {
    baseUrl: BASE_URL,
    endpoints: {
        auth: {
            login: `${API_BASE_V1_URL}/auth/password-dashboard`,
            refresh: `${API_BASE_V1_URL}/auth/refresh`,
        },
        dashboards: {
            getSolution: (solutionUUID: string) => `${API_BASE_V1_URL}/dashboards/${solutionUUID}/solutions`,
            createLog: (dashboardUUID: string) => `${API_BASE_V1_URL}/dashboards/${dashboardUUID}/logs`,
        },
        playlists: {
            getPlaylist: (playlistUUID: string) => `${API_BASE_V1_URL}/playlists/${playlistUUID}/contents/sort`,
        },
        files: {
            getFile: (fileUUID: string) => `${API_BASE_V1_URL}/files/${fileUUID}/dashboard`,
        },
    },
} as const;
