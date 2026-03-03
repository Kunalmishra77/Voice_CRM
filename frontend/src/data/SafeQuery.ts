import { useDiagnosticsStore } from '../state/diagnosticsStore';

interface SafeQueryResult<T> {
  ok: boolean;
  data?: T | null;
  error?: {
    status?: number;
    message: string;
    hint?: string;
    details?: any;
  };
  meta?: { table: string; action: string };
}

export const SafeQuery = async <T>(
  queryPromise: Promise<{ data: T | null; error: any }>,
  meta: { table: string; action: string }
): Promise<SafeQueryResult<T>> => {
  try {
    const response = await queryPromise;
    if (response.error) {
      throw response.error;
    }
    return { ok: true, data: response.data, meta };
  } catch (error: any) {
    let type: 'db' | 'auth' | 'network' = 'db';
    let hint = error.message;
    let recommendedFix = 'Check table schema, column names, and filters.';

    if (error.message?.includes('fetch failed') || error.message?.includes('Failed to fetch')) {
      type = 'network';
      hint = 'Network connection failed.';
      recommendedFix = 'Check Supabase status and internet connection.';
    } else if (error.code === '42P01') {
      hint = `Table '${meta.table}' does not exist.`;
      recommendedFix = `Check if the table name is correct in Supabase.`;
    } else if (error.code === '42703') {
      hint = `Column does not exist in table '${meta.table}'.`;
      recommendedFix = `Check the column names in your query. Case-sensitivity matters!`;
    } else if (error.code === '22P02') {
      hint = `Invalid text representation or column type mismatch.`;
      recommendedFix = `Check if you're passing a string to a UUID/numeric column.`;
    } else if (error.code === 'PGRST116') {
      hint = `JSON/Array type issue or missing data.`;
    } else if (error.status === 401 || error.code === 'PGRST301') {
      type = 'auth';
      hint = 'Missing or invalid JWT token.';
      recommendedFix = 'Check your anon key and authentication state.';
    } else if (error.status === 403) {
      type = 'auth';
      hint = 'Row Level Security (RLS) is blocking this action.';
      recommendedFix = `Add an RLS policy on '${meta.table}' to allow ${meta.action}.`;
    }

    useDiagnosticsStore.getState().addError({
      type,
      table: meta.table,
      action: meta.action,
      status: error.status,
      message: error.message || 'Database error occurred',
      hint,
      details: error,
      recommendedFix
    });

    return {
      ok: false,
      error: {
        status: error.status,
        message: error.message || 'Database error',
        hint,
        details: error
      },
      meta
    };
  }
};
