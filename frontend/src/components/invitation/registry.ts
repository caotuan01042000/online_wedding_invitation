import type { ComponentType } from "react";
import type { TemplateProps } from "@/types/invitation";
import RoseTemplate from "./templates/rose";
import DragonTemplate from "./templates/dragon";
import EmeraldTemplate from "./templates/emerald";
import ForestTemplate from "./templates/forest";
import BotanicalTemplate from "./templates/botanical";

// Key = tbl_templates.code. A new template = one folder + one line here.
export const registry: Record<string, ComponentType<TemplateProps>> = {
  rose: RoseTemplate,
  dragon: DragonTemplate,
  emerald: EmeraldTemplate,
  forest: ForestTemplate,
  botanical: BotanicalTemplate
};