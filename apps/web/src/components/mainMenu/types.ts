import type { Screen } from "../../App";

export type MainMenuItem = {
  label: string;
  screen?: Screen;
  placeholderMessage?: string;
};
