import type { PageInfo } from "@core/types";

const info: Record<string, PageInfo> = {
    dashboard: {
        blocks: []
    },
    not_found: {
        blocks: [
            {
                type: "interface",
                blocks: [
                    {
                        type: "not_found"
                    }
                ]
            }
        ]
    },
    login: {
        blocks: [
            {
                type: "interface",
                blocks: [
                    {
                        type: "header",
                        blocks: [
                            {
                                type: "select_language"
                            }
                        ]
                    },
                    {
                        type: "body",
                        blocks: [
                            {
                                type: "login_form"
                            }
                        ]
                    },
                ]
            }
        ]
    }
};

export default info;
