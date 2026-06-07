export const CACHE_TTL = {
    ONE_MINUTE: 60,
    USER_STATUS: 900, // 15 minutes
    ONE_HOUR: 3600,
    /**
     * one day
     */
    LONG_TERM: 86400, // 1 day
  } as const;

  
  export const CACHE_KEYS = {
    // Dynamic Keys (Functions that return a string)
    USER: (userId: string) => `user:${userId}`,
    USER_PROFILE: (userId: string) => `user:profile:${userId}`,
    USER_SESSION: (userId: string) => `user:session:${userId}`,

    
    BRANCH_DETAILS: (branchId: string) => `branch:${branchId}`,
  
    // static Keys (things that don't change per user)..
    BRANCHES: 'branches:all',
    GLOBAL_SETTINGS: 'settings:global',
  } as const;
  

    