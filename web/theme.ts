export type ThemePreference = "light" | "dark" | "system";

const key = "lc.theme";
const media = window.matchMedia("(prefers-color-scheme: dark)");

export function getThemePreference(): ThemePreference {
  const saved = localStorage.getItem(key);
  return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
}

export function applyTheme(preference: ThemePreference) {
  const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = resolved;
}

export function setThemePreference(preference: ThemePreference) {
  localStorage.setItem(key, preference);
  applyTheme(preference);
  window.dispatchEvent(new CustomEvent("lc:theme", { detail: preference }));
}

export function initializeTheme() {
  applyTheme(getThemePreference());
  media.addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme("system");
  });
}
