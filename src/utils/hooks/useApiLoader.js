import { useState } from 'react';

/**
 * Custom hook for managing API loading states
 * @returns {object} - Loading state and helper functions
 */
const useApiLoader = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Executes an async function with loading state management
   * @param {Function} asyncFunction - The async function to execute
   * @param {object} options - Options for the loader
   * @returns {Promise} - The result of the async function
   */
  const executeWithLoader = async (asyncFunction, options = {}) => {
    const { 
      onStart = () => {}, 
      onSuccess = () => {}, 
      onError = () => {},
      onFinally = () => {}
    } = options;

    setIsLoading(true);
    setError(null);
    
    try {
      onStart();
      const result = await asyncFunction();
      onSuccess(result);
      return result;
    } catch (err) {
      setError(err);
      onError(err);
      throw err;
    } finally {
      setIsLoading(false);
      onFinally();
    }
  };

  /**
   * Resets the loading state and error
   */
  const reset = () => {
    setIsLoading(false);
    setError(null);
  };

  return {
    isLoading,
    error,
    executeWithLoader,
    reset,
  };
};

export default useApiLoader;
