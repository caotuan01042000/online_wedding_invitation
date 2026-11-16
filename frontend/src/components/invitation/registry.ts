import type { ComponentType } from "react";
import type { TemplateProps } from "@/types/invitation";
import RoseTemplate from "./templates/rose";
import DragonTemplate from "./templates/dragon";

// Key = tbl_templates.code. A new template = one folder + one line here.
export const registry: Record<string, ComponentType<TemplateProps>> = {
  rose: RoseTemplate,
  dragon: DragonTemplate,
};