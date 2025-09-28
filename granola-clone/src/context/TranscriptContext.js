/**
 * @fileoverview Transcript Context - Global State Management for Transcripts
 * @description Provides centralized state management for transcript data with
 * API integration for persistent storage and retrieval.
 *
 * Features:
 * - Centralized transcript state management
 * - Automatic data fetching on mount
 * - Optimistic updates for better UX
 * - Error handling and loading states
 * - Type-safe context usage
 *
 * @author AI Assistant
 * @version 2.0.0
 * @since 2025-09-27
 */

// =============================================================================
// IMPORTS
// =============================================================================

import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import axios from "axios";

// =============================================================================
// CONSTANTS
// =============================================================================

const API_CONFIG = {
  BASE_URL: "http://localhost:5000/api/transcripts",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// =============================================================================
// CONTEXT CREATION
// =============================================================================

/**
 * @context TranscriptContext
 * @description Context for managing transcript data across the application
 */
export const TranscriptContext = createContext({
  transcripts: [],
  isLoading: false,
  error: null,
  addTranscript: () => {},
  refreshTranscripts: () => {},
  clearError: () => {},
});

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

/**
 * @component TranscriptProvider
 * @description Provides transcript context to child components
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element} Provider component
 */
export const TranscriptProvider = ({ children }) => {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================

  const [transcripts, setTranscripts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ==========================================================================
  // API FUNCTIONS
  // ==========================================================================

  /**
   * @function fetchTranscripts
   * @description Fetches all transcripts from the API with retry logic
   * @returns {Promise<void>}
   */
  const fetchTranscripts = useCallback(async () => {
    let attempts = 0;

    while (attempts < API_CONFIG.RETRY_ATTEMPTS) {
      try {
        setIsLoading(true);
        setError(null);

        console.log(
          `📡 Fetching transcripts (attempt ${attempts + 1}/${
            API_CONFIG.RETRY_ATTEMPTS
          })`
        );

        const response = await axios.get(API_CONFIG.BASE_URL, {
          timeout: API_CONFIG.TIMEOUT,
        });

        setTranscripts(response.data || []);
        console.log(`✅ Loaded ${response.data?.length || 0} transcripts`);

        setIsLoading(false);
        return;
      } catch (fetchError) {
        attempts++;
        console.error(
          `❌ Failed to fetch transcripts (attempt ${attempts}):`,
          fetchError
        );

        if (attempts >= API_CONFIG.RETRY_ATTEMPTS) {
          const errorMessage =
            fetchError.response?.status === 404
              ? "Transcript service not available"
              : fetchError.code === "ECONNREFUSED"
              ? "Cannot connect to server. Please ensure the backend is running."
              : fetchError.message.includes("timeout")
              ? "Request timed out. Please check your internet connection."
              : "Failed to load transcripts";

          setError(errorMessage);
          setIsLoading(false);
          return;
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, API_CONFIG.RETRY_DELAY * attempts)
        );
      }
    }
  }, []);

  /**
   * @function addTranscript
   * @description Adds a new transcript with optimistic updates
   * @param {Object} newTranscript - Transcript data to add
   * @param {string} newTranscript.title - Transcript title
   * @param {string} newTranscript.date - Transcript date
   * @param {string} newTranscript.content - Transcript content
   * @param {string} [newTranscript.duration] - Recording duration
   * @returns {Promise<Object|null>} Added transcript or null if failed
   */
  const addTranscript = useCallback(async (newTranscript) => {
    if (!newTranscript || !newTranscript.content?.trim()) {
      console.error("❌ Cannot add empty transcript");
      setError("Cannot save empty transcript");
      return null;
    }

    // Validate required fields
    const transcript = {
      title: newTranscript.title || "Untitled Meeting",
      date: newTranscript.date || new Date().toISOString().split("T")[0],
      content: newTranscript.content.trim(),
      duration: newTranscript.duration || "Unknown",
    };

    // Optimistic update - add to UI immediately
    const tempId = Date.now();
    const optimisticTranscript = { ...transcript, id: tempId };

    setTranscripts((prev) => [...prev, optimisticTranscript]);
    console.log("📝 Added transcript optimistically:", transcript.title);

    try {
      const response = await axios.post(API_CONFIG.BASE_URL, transcript, {
        timeout: API_CONFIG.TIMEOUT,
      });

      // Replace optimistic update with real data
      setTranscripts((prev) =>
        prev.map((t) => (t.id === tempId ? response.data : t))
      );

      console.log("✅ Transcript saved successfully:", response.data.title);
      return response.data;
    } catch (saveError) {
      console.error("❌ Failed to save transcript:", saveError);

      // Revert optimistic update
      setTranscripts((prev) => prev.filter((t) => t.id !== tempId));

      const errorMessage =
        saveError.response?.status === 413
          ? "Transcript too large to save"
          : saveError.code === "ECONNREFUSED"
          ? "Cannot connect to server to save transcript"
          : "Failed to save transcript";

      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * @function refreshTranscripts
   * @description Manually refreshes transcript data
   * @returns {Promise<void>}
   */
  const refreshTranscripts = useCallback(async () => {
    console.log("🔄 Manually refreshing transcripts");
    await fetchTranscripts();
  }, [fetchTranscripts]);

  /**
   * @function clearError
   * @description Clears the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * @effect Initial Data Load
   * @description Loads transcript data when provider mounts
   */
  useEffect(() => {
    console.log("🚀 TranscriptProvider initializing");
    fetchTranscripts();
  }, [fetchTranscripts]);

  // ==========================================================================
  // CONTEXT VALUE
  // ==========================================================================

  /**
   * @memo contextValue
   * @description Memoized context value to prevent unnecessary re-renders
   */
  const contextValue = useMemo(
    () => ({
      // Data
      transcripts,
      isLoading,
      error,

      // Actions
      addTranscript,
      refreshTranscripts,
      clearError,

      // Computed properties
      totalTranscripts: transcripts.length,
      hasTranscripts: transcripts.length > 0,
    }),
    [
      transcripts,
      isLoading,
      error,
      addTranscript,
      refreshTranscripts,
      clearError,
    ]
  );

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <TranscriptContext.Provider value={contextValue}>
      {children}
    </TranscriptContext.Provider>
  );
};
