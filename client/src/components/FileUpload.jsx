import { useRef, useState } from "react";

export function FileUpload({ onUpload, disabled }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file) {
    if (!file || disabled) return;

    if (!file.name.endsWith(".csv")) {
      alert("Only CSV files are allowed");
      return;
    }

    onUpload(file);
  }

  function handleInputChange(e) {
    const file = e.target.files?.[0];
    handleFile(file);
    // reset input so same file can be uploaded again
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !disabled && inputRef.current?.click()}
      className={[
        "flex flex-col items-center justify-center",
        "w-full h-48 rounded-xl border-2 border-dashed",
        "cursor-pointer transition-colors duration-200",
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50",
        disabled && "opacity-50 cursor-not-allowed",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      <div className="flex flex-col items-center gap-2 pointer-events-none">
        {/* icon */}
        <div className="text-4xl">{isDragging ? "📂" : "📁"}</div>

        <p className="text-sm font-medium text-gray-700">
          {isDragging ? "Drop your CSV here" : "Drag and drop a CSV file here"}
        </p>

        <p className="text-xs text-gray-400">or click to browse</p>
      </div>
    </div>
  );
}
