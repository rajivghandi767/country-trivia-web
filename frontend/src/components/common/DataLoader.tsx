interface DataLoaderProps<T> {
  isLoading: boolean;
  error: string | null;
  data: T[] | null | undefined;
  children: (data: T[]) => React.ReactNode;
  emptyMessage?: string;
}

const DataLoader = <T,>({
  isLoading,
  error,
  data,
  children,
  emptyMessage = "No items available at this time.",
}: DataLoaderProps<T>) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black dark:border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-8">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg border border-red-200 dark:border-red-900">
          {error}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <div className="text-center p-8">{emptyMessage}</div>;
  }

  return <>{children(data)}</>;
};

export default DataLoader;
