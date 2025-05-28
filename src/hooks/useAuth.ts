// This hook is no longer used as Firebase Authentication has been removed.
// You can delete this file: src/hooks/useAuth.ts

// console.log("useAuth hook has been removed due to Firebase removal.");

// If you need a local "user" concept without Firebase, this would be reimplemented.
// For now, it's non-functional.
export const useAuth = () => {
  return {
    user: null,
    loading: false,
    logout: async () => {},
    // setUser: () => {}, // If needed for a local solution
  };
};
