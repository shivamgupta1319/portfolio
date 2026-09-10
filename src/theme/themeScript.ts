/**
 * Runs inline in <head> before hydration so the first paint already has the
 * right theme. Reads the persisted prefs store, falls back to the OS setting.
 * Keep in sync with PREFS_KEY in src/lib/prefsStore.ts.
 */
export const THEME_SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem('shivam.prefs.v1')||'null');var t=s&&s.state&&s.state.theme;if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();`;
