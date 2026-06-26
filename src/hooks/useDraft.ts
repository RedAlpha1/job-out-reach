import { useCallback, useState } from "react";
import { generateDraft, LLMError } from "../lib/llm";
import type { DraftContext } from "../lib/llm";
import type { Draft, LLMSettings, Profile } from "../types";

interface DraftState {
  draft: Draft | null;
  context: DraftContext | null;
  loading: boolean;
  error: string | null;
}

const INITIAL: DraftState = {
  draft: null,
  context: null,
  loading: false,
  error: null,
};

export function useDraft() {
  const [state, setState] = useState<DraftState>(INITIAL);

  const draftEmail = useCallback(
    async (settings: LLMSettings, profile: Profile, recipient: string, jd: string) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const { draft, context } = await generateDraft(settings, profile, recipient, jd);
        setState({ draft, context, loading: false, error: null });
        return { draft, context };
      } catch (e) {
        const message =
          e instanceof LLMError
            ? e.message
            : "Something went wrong generating the draft.";
        setState((s) => ({ ...s, loading: false, error: message }));
        return null;
      }
    },
    [],
  );

  /** Let the user edit subject/body inline after generation. */
  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setState((s) => (s.draft ? { ...s, draft: { ...s.draft, ...patch } } : s));
  }, []);

  /** Load an existing draft into the editor (e.g. reopened from history). */
  const loadDraft = useCallback((draft: Draft) => {
    setState({ draft, context: null, loading: false, error: null });
  }, []);

  const dismissError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  return {
    draft: state.draft,
    context: state.context,
    loading: state.loading,
    error: state.error,
    draftEmail,
    updateDraft,
    loadDraft,
    dismissError,
  };
}
