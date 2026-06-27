import type { MainMenuItem } from "./types";

type MainMenuButtonProps = {
  item: MainMenuItem;
  onSelect: (item: MainMenuItem) => void;
};

export function MainMenuButton({ item, onSelect }: MainMenuButtonProps) {
  return (
    <button className="menu-button" type="button" onClick={() => onSelect(item)}>
      <span>{item.label}</span>
      <span className="underline" />
    </button>
  );
}
