/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */


import { ContainerModule } from "inversify"
import { FrontendApplicationContribution } from "../../application/browser";
import { TerminalWidget, TerminalWidgetFactory } from './terminal-widget';
import { TerminalFrontendContribution } from "./terminal-frontend-contribution";

export default new ContainerModule(bind => {
    bind(TerminalWidget).toSelf().inTransientScope();
    bind(TerminalWidgetFactory).toAutoFactory(TerminalWidget);

    bind(TerminalFrontendContribution).toSelf().inSingletonScope();
    bind(FrontendApplicationContribution).toDynamicValue(ctx =>
        ctx.container.get(TerminalFrontendContribution)
    );
});
