import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage";

/* ========================================
   REDUX STORE CONFIGURATION
   ========================================
   
   Architecture:
   - Dynamic reducer registry for easy slice addition
   - Granular persistence control per slice
   - Type-safe with strong separation of concerns
   
   To add a new slice:
   1. Import the reducer
   2. Add to reducerRegistry
   3. (Optional) Add to persistConfigRegistry if persistence needed
   
======================================== */

/* -----------------------------
   1. Import Slice Reducers
-------------------------------- */

import userReducer from "./slices/userSlice.js";

/* -----------------------------
   2. Reducer Registry
   Central registry of all reducers
-------------------------------- */

const reducerRegistry = {
  user: userReducer,
};

/* -----------------------------
   3. Persist Config Registry
   Configure which slices/fields to persist
-------------------------------- */

const persistConfigRegistry = {
  user: {
    key: "user",
    version: 1, // Increment when changing persisted shape
    storage,
    whitelist: ["profile"], // Only persist profile data
  },
};

/* -----------------------------
   4. Apply Persistence Dynamically
   Wraps reducers with persistence if configured
-------------------------------- */

const persistedReducers = Object.keys(reducerRegistry).reduce(
  (acc, sliceKey) => {
    const reducer = reducerRegistry[sliceKey];
    const persistConfig = persistConfigRegistry[sliceKey];

    acc[sliceKey] = persistConfig
      ? persistReducer(persistConfig, reducer)
      : reducer;

    return acc;
  },
  {}
);

/* -----------------------------
   5. Root Reducer
   Combines all persisted/non-persisted reducers
-------------------------------- */

const rootReducer = combineReducers(persistedReducers);

/* -----------------------------
   6. Store Configuration
   Main Redux store with middleware
-------------------------------- */

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        // Optionally ignore specific paths
        // ignoredPaths: ['user.someNonSerializableField'],
      },
    }),
  devTools: import.meta.env.VITE_MODE !== "production", // Enable Redux DevTools in dev
});

/* -----------------------------
   7. Persistor
   Handles rehydration from localStorage
-------------------------------- */

export const persistor = persistStore(store);

/* -----------------------------
   8. Type Exports (TypeScript support)
-------------------------------- */

// Infer the `RootState` type from the store itself
export const selectUser = (state) => state.user;

// Export store type for hooks
// Usage: const dispatch: AppDispatch = useDispatch();
export const getStoreState = () => store.getState();

/* -----------------------------
   9. Utility Functions
-------------------------------- */

/**
 * Clear all persisted state (useful for logout)
 */
export const clearPersistedState = async () => {
  await persistor.purge();
  await persistor.flush();
};

/**
 * Reset store to initial state
 */
export const resetStore = () => {
  store.dispatch({ type: "RESET_APP" });
  clearPersistedState();
};
