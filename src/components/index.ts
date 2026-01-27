import type { ComponentsContext } from "@core/types";

import { Solution } from "./solution";
import { Screen } from "./screen";
import { LoginForm } from "./login-form";
import { SelectLanguage } from "./select-language";
import { Header } from "./header";
import { Body } from "./body";
import { NotFound } from "./not-found";
import { Interface } from "./interface";
import { ControlPanel } from "./control-panel";
import { SplashLogo } from "./ui";
import { Widget } from "./widget";

const components: ComponentsContext = {
    solution: Solution,
    screen: Screen,
    login_form: LoginForm,
    select_language: SelectLanguage,
    header: Header,
    body: Body,
    not_found: NotFound,
    interface: Interface,
    control_panel: ControlPanel,
    widget: Widget,
    empty_solution: SplashLogo,
};

export default components;