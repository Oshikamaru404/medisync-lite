export const APP_NAVIGATION_EVENT = "shifalyx:app-navigation";

export const requestAppNavigation = (to: string, isBack = false) => {
  window.dispatchEvent(new CustomEvent(APP_NAVIGATION_EVENT, { detail: { to, isBack } }));
};
