import { useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  maxSizeMB?: number;
}

export default function FileUpload({ onFile, accept = '.pdf,.jpg,.jpeg,.png', label = 'Upload file', maxSizeMB = 5 }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function validate(file: File): string | null {
    if (file.size > maxSizeMB * 1024 * 1024) return `File must be under ${maxSizeMB}MB`;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) return 'Only PDF, JPG, PNG files are allowed';
    return null;
  }

  function handle(file: File) {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError('');
    setFileName(file.name);
    onFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handle(f); }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
        }`}
      >
        <p className="text-sm text-gray-600">{fileName || label}</p>
        <p className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — max {maxSizeMB}MB</p>
      </div>
      {error && <p className="form-error">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
      />
    </div>
  );
}
