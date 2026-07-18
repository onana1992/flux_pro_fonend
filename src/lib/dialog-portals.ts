/**
 * Empêche la fermeture d'un Dialog Radix quand l'interaction
 * cible (ou coexiste avec) un overlay portailé (Select, DropdownMenu, Popover…),
 * rendu hors de Dialog.Content — typiquement un clic « sur le modal »
 * traverse le calque de dismiss du Select et serait vu comme outside.
 */
const PORTALED_OVERLAY_SELECTOR = [
  "[data-radix-select-content]",
  "[data-radix-select-viewport]",
  "[data-radix-popper-content-wrapper]",
  "[data-radix-dropdown-menu-content]",
  "[data-radix-popover-content]",
  "[role='listbox']",
  ".rt-SelectContent",
  ".rt-DropdownMenuContent",
  ".rt-PopoverContent",
].join(", ");

const OPEN_PORTALED_OVERLAY_SELECTOR = [
  "[data-radix-select-content][data-state='open']",
  ".rt-SelectContent[data-state='open']",
  "[data-radix-dropdown-menu-content][data-state='open']",
  ".rt-DropdownMenuContent[data-state='open']",
  "[data-radix-popover-content][data-state='open']",
  ".rt-PopoverContent[data-state='open']",
].join(", ");

export function preventDialogDismissFromPortals(event: {
  target: EventTarget | null;
  preventDefault: () => void;
}): void {
  const target = event.target;
  if (target instanceof Element && target.closest(PORTALED_OVERLAY_SELECTOR)) {
    event.preventDefault();
    return;
  }
  // Select ouvert : le calque de dismiss est hors du Dialog ; ne pas fermer le modal.
  if (typeof document !== "undefined" && document.querySelector(OPEN_PORTALED_OVERLAY_SELECTOR)) {
    event.preventDefault();
  }
}
