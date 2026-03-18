import { AxiosError } from 'axios';
import { ApiError } from '../../types';

interface ErrorMessageProps {
  error: Error | AxiosError<ApiError> | null | unknown;
  title?: string;
  className?: string;
  onRetry?: () => void;
}

function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred.';
  if (error instanceof Error) {
    const axiosError = error as AxiosError<ApiError>;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    return error.message;
  }
  return String(error);
}

export function ErrorMessage({
  error,
  title = 'Something went wrong',
  className = '',
  onRetry,
}: ErrorMessageProps) {
  const message = getErrorMessage(error);

  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-red-500" aria-hidden="true">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800">{title}</h3>
          <p className="mt-1 text-sm text-red-700">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p role="alert" className="mt-1 text-sm text-red-600">
      {message}
    </p>
  );
}
