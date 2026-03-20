import React, { useState } from "react";
import axios from "axios";

const Importsheet = () => {
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");

  // 🔹 Import Handler
  const handleImport = async () => {
    try {
      const res = await axios.post("http://localhost:5000/import", {
        sheetUrl: url,
      });

      setMessage(
        res.data.message + " (" + res.data.importedCount + " tasks)"
      );
      setUrl("");
    } catch (error) {
      setMessage(error.response?.data?.message || "Error importing data");
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      
      {/* Heading */}
      <h2 className="text-xl font-bold mb-4">
        📥 Import Tasks from Google Sheet
      </h2>

      {/* Input + Button */}
      <div className="flex flex-col md:flex-row gap-3">
        <input
          type="text"
          placeholder="Paste Google Sheet Link"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />

        <button
          onClick={handleImport}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition"
        >
          Import
        </button>
      </div>

      {/* Message */}
      {message && (
        <p className="mt-4 text-sm text-green-600 font-medium">
          {message}
        </p>
      )}
    </div>
  );
};

export default Importsheet;