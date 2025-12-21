import type { Route } from "@core/types";

const routes: Record<string, Route> = {
    login: {
        code: "login",
        auth: false,
        page: "login",
    },
    dashboard: {
        code: "dashboard",
        auth: true,
        before: ["login"],
        page: "dashboard",
    },
    not_found: {
        code: "not_found",
        auth: false,
        page: "not_found",
    },
};

export default routes;
