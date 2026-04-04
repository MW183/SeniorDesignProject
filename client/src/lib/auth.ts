/**
 * Auth event management system for handling token expiration and automatic logout
 */

type LogoutListener = () => void;
let logoutListeners: LogoutListener[] = [];
let hasTriggeredLogout = false;

/**
 * Subscribe to logout events (e.g., when JWT expires)
 * @param listener - Callback function to invoke on logout
 * @returns Unsubscribe function
 */
export function onLogoutNeeded(listener: LogoutListener): () => void {
  logoutListeners.push(listener);
  return () => {
    logoutListeners = logoutListeners.filter(l => l !== listener);
  };
}

/**
 * Trigger logout event (e.g., when API returns 401)
 * Only triggers once per session to prevent infinite loops
 */
export function triggerLogout(): void {
  // Only trigger logout once to prevent infinite loops
  if (hasTriggeredLogout) {
    return;
  }
  hasTriggeredLogout = true;
  
  logoutListeners.forEach(listener => listener());
}

/**
 * Reset the logout trigger (used when user logs in again)
 */
export function resetLogoutTrigger(): void {
  hasTriggeredLogout = false;
}

/**
 * Clear all logout listeners
 */
export function clearLogoutListeners(): void {
  logoutListeners = [];
  hasTriggeredLogout = false;
}

/**
 * Get current listener count (for debugging)
 */
export function getLogoutListenerCount(): number {
  return logoutListeners.length;
}

