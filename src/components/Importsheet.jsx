import { useState } from "react";
import { importTasksFromSheet, previewSheet } from "../lib/api";

const TASK_FIELDS = [
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "dueDate", label: "Due Date" },
  { value: "completed", label: "Completed" },
];

const Importsheet = ({ refreshTasks, showToast }) => {
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePreview = async () => {
    if (!url.trim()) {
      const emptyMessage = "Pehle Google Sheet link paste karo.";
      showToast?.(emptyMessage, "error");
      return;
    }

    try {
      setIsLoading(true);
      const result = await previewSheet(url);
      setPreview(result);
      setMapping((currentMapping) => {
        const availableColumns = Object.keys(result.columns[0] || {}).filter(
          (columnName) => columnName !== "__row"
        );

        const nextMapping = { ...currentMapping };

        TASK_FIELDS.forEach(({ value }) => {
          if (nextMapping[value] && availableColumns.includes(nextMapping[value])) {
            return;
          }

          const matchedColumn = availableColumns.find(
            (columnName) =>
              columnName.toLowerCase().replace(/[^a-z0-9]/g, "") ===
              value.toLowerCase().replace(/[^a-z0-9]/g, "")
          );

          nextMapping[value] = matchedColumn || "";
        });

        return nextMapping;
      });
      const successMessage = "Preview ready. Mapping check karke import karo.";
      showToast?.(successMessage);
    } catch (error) {
      setPreview(null);
      setMapping({});
      const errorMessage =
        error.response?.data?.message ||
          error.message ||
          "Error importing data";
      showToast?.(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview) {
      const previewMessage = "Pehle preview load karo, phir import karo.";
      showToast?.(previewMessage, "error");
      return;
    }

    try {
      setIsLoading(true);
      const result = await importTasksFromSheet(url, mapping);
      setPreview(result.preview);
      const successMessage = result.message;
      showToast?.(successMessage);
      refreshTasks?.();
      setUrl("");
      setPreview(null);
      setMapping({});
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
          error.message ||
          "Error importing data";
      showToast?.(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (field, value) => {
    setMapping((currentMapping) => ({
      ...currentMapping,
      [field]: value,
    }));
  };

  const previewColumns = Object.keys(preview?.columns[0] || {}).filter(
    (columnName) => columnName !== "__row"
  );

  return (
    <div className="mb-6 rounded-lg bg-white p-6 shadow-md">
      <h2 className="mb-4 text-xl font-bold">Import Tasks from Google Sheet</h2>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          type="text"
          placeholder="Paste Google Sheet Link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          type="button"
          onClick={handlePreview}
          disabled={isLoading}
          className="rounded bg-slate-700 px-4 py-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Loading..." : "Preview"}
        </button>
      </div>

      {preview && (
        <div className="mt-6 space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Column Mapping</h3>
              <button
                type="button"
                onClick={handleImport}
                disabled={isLoading}
                className="rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Importing..." : "Import Tasks"}
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {TASK_FIELDS.map((field) => (
                <label
                  key={field.value}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <span className="mb-2 block text-sm font-medium text-gray-700">
                    {field.label}
                  </span>
                  <select
                    value={mapping[field.value] || ""}
                    onChange={(e) =>
                      handleMappingChange(field.value, e.target.value)
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Do not import</option>
                    {previewColumns.map((columnName) => (
                      <option key={`${field.value}-${columnName}`} value={columnName}>
                        {columnName}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Raw Rows Preview</h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full bg-white text-sm">
                <tbody>
                  {preview.rows.map((row, rowIndex) => (
                    <tr key={`raw-${rowIndex}`} className="border-t">
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`raw-${rowIndex}-${cellIndex}`}
                          className="px-3 py-2 align-top text-gray-700"
                        >
                          {cell || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-lg font-semibold">Column Format Preview</h3>
            {preview.columns.length === 0 ? (
              <p className="rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-600">
                Header mila, lekin koi data row nahi mili.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full bg-white text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      {Object.keys(preview.columns[0]).map((columnName) => (
                        <th
                          key={columnName}
                          className="px-3 py-2 text-left font-semibold text-gray-700"
                        >
                          {columnName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.columns.map((row, rowIndex) => (
                      <tr key={`column-${rowIndex}`} className="border-t">
                        {Object.entries(row).map(([columnName, value]) => (
                          <td
                            key={`${columnName}-${rowIndex}`}
                            className="px-3 py-2 align-top text-gray-700"
                          >
                            {value || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Importsheet;
