import axios from "axios";

const DEFAULT_LOCAL_API_URL = "http://localhost:5000";

const trimTrailingSlash = (value = "") => value.replace(/\/$/, "");

const getRenderBackendUrl = (hostname = "") => {
  if (!hostname.endsWith(".onrender.com")) {
    return "";
  }

  if (hostname.includes("-frontend")) {
    return `https://${hostname.replace("-frontend", "-backend")}`;
  }

  if (hostname.includes("frontend")) {
    return `https://${hostname.replace("frontend", "backend")}`;
  }

  return "";
};

const resolveApiBaseUrl = () => {
  const envApiUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || "");
  if (envApiUrl) {
    return envApiUrl;
  }

  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_API_URL;
  }

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return DEFAULT_LOCAL_API_URL;
  }

  const renderBackendUrl = getRenderBackendUrl(hostname);
  if (renderBackendUrl) {
    return renderBackendUrl;
  }

  return trimTrailingSlash(origin);
};

export const API_BASE_URL = resolveApiBaseUrl();

const normalizeDueDate = (dueDate) => {
  if (!dueDate) {
    return "";
  }

  const parsedDate = new Date(dueDate);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString();
};

const normalizeTask = (task) => ({
  _id: task._id || crypto.randomUUID(),
  title: task.title?.toString().trim() || "Untitled",
  description: task.description?.toString().trim() || "",
  dueDate: normalizeDueDate(task.dueDate),
  completed: Boolean(task.completed),
});

const getErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.message || error.message || fallbackMessage;

export const loadTasks = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/tasks`, {
      timeout: 5000,
    });

    return {
      tasks: Array.isArray(response.data) ? response.data : [],
      source: "backend",
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Tasks load nahi ho pa rahe. Backend ya database connection check karo."
      )
    );
  }
};

export const createTask = async (task) => {
  const normalizedTask = normalizeTask(task);

  try {
    const response = await axios.post(`${API_BASE_URL}/tasks`, normalizedTask, {
      timeout: 5000,
    });

    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Task save nahi hua. Backend server ya database connection check karo."
      )
    );
  }
};

export const removeTask = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/tasks/${id}`, {
      timeout: 5000,
    });
    return;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Task delete nahi hua. Dobara try karo.")
    );
  }
};

export const updateTask = async (id, updates) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/tasks/${id}`, updates, {
      timeout: 5000,
    });
    return response.data;
  } catch (error) {
    throw new Error(
      getErrorMessage(error, "Task update nahi hua. Dobara try karo.")
    );
  }
};

const getPathSegments = (url) =>
  url.pathname.split("/").filter(Boolean).map(decodeURIComponent);

const toPublishedCsvUrl = (inputUrl) => {
  const url = new URL(inputUrl);
  const gid = url.searchParams.get("gid") || url.hash.match(/gid=(\d+)/)?.[1];
  const segments = getPathSegments(url);

  const publishedIndex = segments.indexOf("e");
  if (
    url.hostname.includes("docs.google.com") &&
    segments[0] === "spreadsheets" &&
    publishedIndex !== -1
  ) {
    const publishedId = segments[publishedIndex + 1];
    return `https://docs.google.com/spreadsheets/d/e/${publishedId}/pub?output=csv`;
  }

  const docIndex = segments.indexOf("d");
  if (
    url.hostname.includes("docs.google.com") &&
    segments[0] === "spreadsheets" &&
    docIndex !== -1
  ) {
    const spreadsheetId = segments[docIndex + 1];
    const csvUrl = new URL(
      `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq`
    );
    csvUrl.searchParams.set("tqx", "out:csv");
    if (gid) {
      csvUrl.searchParams.set("gid", gid);
    }
    return csvUrl.toString();
  }

  throw new Error("Google Sheet ka valid public URL paste karo.");
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        value += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }

  return rows.filter((currentRow) =>
    currentRow.some((cell) => cell.toString().trim() !== "")
  );
};

const buildObjectsFromRows = (rows) => {
  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  const safeHeaders = headers.map((header, index) =>
    header?.trim() || `Column ${index + 1}`
  );

  return dataRows.map((row, rowIndex) =>
    safeHeaders.reduce(
      (accumulator, header, columnIndex) => ({
        ...accumulator,
        __row: rowIndex + 2,
        [header]: row[columnIndex]?.trim() || "",
      }),
      {}
    )
  );
};

const mapRowToTask = (row, mapping = {}) => {
  const normalizedEntries = Object.entries(row).reduce(
    (accumulator, [key, value]) => ({
      ...accumulator,
      [key.toLowerCase().replace(/[^a-z0-9]/g, "")]: value,
    }),
    {}
  );

  const mappedEntries = Object.entries(mapping).reduce(
    (accumulator, [taskField, sourceColumn]) => {
      if (!sourceColumn || !row[sourceColumn]) {
        return accumulator;
      }

      return {
        ...accumulator,
        [taskField]: row[sourceColumn],
      };
    },
    {}
  );

  const mappedCompleted = mappedEntries.completed
    ?.toString()
    .toLowerCase()
    .trim();

  return normalizeTask({
    title:
      mappedEntries.title ||
      normalizedEntries.title ||
      normalizedEntries.task ||
      normalizedEntries.name ||
      "",
    description:
      mappedEntries.description ||
      normalizedEntries.description ||
      normalizedEntries.details ||
      normalizedEntries.notes ||
      "",
    dueDate:
      mappedEntries.dueDate ||
      normalizedEntries.duedate ||
      normalizedEntries.date ||
      normalizedEntries.deadline ||
      "",
    completed: mappedEntries.completed
      ? ["true", "done", "completed", "yes"].includes(mappedCompleted)
      : ["true", "done", "completed", "yes"].includes(
          normalizedEntries.completed?.toString().toLowerCase()
        ),
  });
};

export const previewSheet = async (sheetUrl) => {
  try {
    const csvUrl = toPublishedCsvUrl(sheetUrl);
    const response = await fetch(csvUrl);

    if (!response.ok) {
      throw new Error("Sheet data fetch nahi ho paaya.");
    }

    const csvText = await response.text();
    const rows = parseCsv(csvText);
    const columns = buildObjectsFromRows(rows);

    return {
      csvUrl,
      rows,
      columns,
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Sheet load nahi hui. Sheet ko public/published karo aur link dobara check karo."
      )
    );
  }
};

export const importTasksFromSheet = async (sheetUrl, mapping = {}) => {
  const preview = await previewSheet(sheetUrl);
  const importedTasks = preview.columns
    .map((row) => mapRowToTask(row, mapping))
    .filter((task) => task.title);

  if (importedTasks.length === 0) {
    throw new Error("Mapping ke baad import karne layak koi valid task nahi mila.");
  }

  try {
    const responses = await Promise.all(
      importedTasks.map((task) =>
        axios.post(`${API_BASE_URL}/tasks`, task, {
          timeout: 5000,
        })
      )
    );

    return {
      importedCount: responses.length,
      message: `${responses.length} tasks database me import ho gaye.`,
      preview,
      source: "backend",
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        "Tasks import nahi hue. Backend server ya database connection check karo."
      )
    );
  }
};
