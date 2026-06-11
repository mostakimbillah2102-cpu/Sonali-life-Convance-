import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-emerald-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">কিছু একটা সমস্যা হয়েছে!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              অ্যাপ্লিকেশনটি লোড করতে সমস্যা হচ্ছে। দয়া করে পেজটি রিফ্রেশ করুন।
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-xl transition-colors w-full"
            >
              পেজ রিফ্রেশ করুন
            </button>
            {this.state.error && (
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg text-left overflow-auto text-xs text-red-500 font-mono max-h-32">
                {this.state.error.toString()}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
