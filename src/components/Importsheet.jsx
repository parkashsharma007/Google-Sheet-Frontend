import React, { useState } from "react";
import axios from "axios";

const Importsheet = ({ refreshTasks }) => {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");

  const handleImport = async () => {
    if (!url.trim()) {
      setMessage("Pehle Google Sheet link paste karo.");
      return;
    }

    try {
      const res = await axios.post("https://google-sheet-hkcm.onrender.com/import", {
        sheetUrl: url,
      });

      setMessage(`${res.data.message} (${res.data.importedCount} tasks)`);
      refreshTasks?.();
      setUrl("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error importing data");
    }
  };

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
          onClick={handleImport}
          className="rounded bg-blue-500 px-4 py-2 text-white transition hover:bg-blue-600"
        >
          Import
        </button>
      </div>

      {message && (
        <p className="mt-4 text-sm font-medium text-green-600">{message}</p>
      )}
    </div>
  );
};

export default Importsheet;
