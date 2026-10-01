/**
 * Generic email/password form login. ADJUST TO THE APP: route, labels, button name and the
 * "logged in" signal below are conventions, not facts about your app. session.mjs calls this
 * (config e2e.loginFlow) with the credentials it read from the env file.
 *
 * Performs and returns; asserts nothing. A wrong credential surfaces as the URL wait timing
 * out — do not retry a bad credential in a loop (most apps lock the account).
 */
export const module = 'auth';
export const action = 'log in with email + password';
export const needs = ['email', 'password'];
export const creates = null;

export async function run(s, d) {
  await s.goto(d.route || '/login');
  await s.page.getByLabel(/email/i).first().fill(d.email);
  await s.page.getByLabel(/password/i).first().fill(d.password);
  await s.page.getByRole('button', { name: /sign in|log in/i }).first().click();
  // Logged in = the app navigated away from the login route.
  await s.page.waitForURL((u) => !/\/login\b/.test(u.pathname), { timeout: 30000 });
  await s.page.waitForLoadState('domcontentloaded');
  return { url: s.page.url() };
}
