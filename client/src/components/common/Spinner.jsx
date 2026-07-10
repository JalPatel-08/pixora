export const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-border border-t-primary`} />
  );
};

export const PageSpinner = () => (
  <div className="flex h-64 items-center justify-center">
    <Spinner size="lg" />
  </div>
);
