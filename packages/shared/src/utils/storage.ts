/**
 * Local storage utility functions
 * Provides type-safe localStorage access with error handling
 */

/**
 * Gets an item from localStorage
 * @param key The storage key
 * @param defaultValue The default value to return if key not found
 */
export const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
      const item = window.localStorage.getItem(key);
  
      if (!item) return defaultValue;
  
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
  
  
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return defaultValue;
    }
  };
  
  /**
   * Sets an item in localStorage
   */
  export const setInStorage = <T>(key: string, value: T): boolean => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
      return false;
    }
  };
  
  /**
   * Removes an item from localStorage
   */
  export const removeFromStorage = (key: string): boolean => {
    try {
      window.localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
      return false;
    }
  };
  
  /**
   * Clears all items from localStorage
   */
  export const clearStorage = (): boolean => {
    try {
      window.localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  };
  
  /**
   * Checks if localStorage is available
   */
  export const isStorageAvailable = (): boolean => {
    try {
      const testKey = '__storage_test__';
      window.localStorage.setItem(testKey, 'test');
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  };
  
  // Storage keys used in the app
  export const STORAGE_KEYS = {
    // Auth
    ACCESS_TOKEN: 'citydenapartments_access_token',
    USER: 'citydenapartments_user',
  
    // App Preferences
    THEME: 'citydenapartments_theme',
    USER_PREFERENCES: 'citydenapartments_user_preferences',
  
    
  } as const;
  