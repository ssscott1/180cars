interface Props {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ fullScreen, size = 'md' }: Props) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' }[size];

  const spinner = (
    <div className={`${sizeClass} animate-spin rounded-full border-2 border-gray-300 border-t-blue-600`} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
        {spinner}
      </div>
    );
  }

  return <div className="flex justify-center p-8">{spinner}</div>;
}
