import axios from "axios";

const DEFAULT_LOCAL_API_URL = "http://localhost:5000";
const LOCAL_TASKS_STORAGE_KEY = "tasks";
const API_TIMEOUT_MS = 5000;

const trimTrailingSlash = (value = "") => value.replace(/\/$/, "");

const buildRenderBackendCandidates = (hostname = "") => {
  if (!hostname.endsWith(".onrender.com")) {
    return [];
  }

  const candidates = new Set();

  if (hostname.includes("-frontend")) {
    candidates.add(`https://${hostname.replace("-frontend", "-backend")}`);
    candidates.add(`https://${hostname.replace("-frontend", "")}`);
  }

  if (hostname.includes("frontend")) {
    candidates.add(`https://${hostname.replace("frontend", "backend")}`);
  }

  return [...candidates];
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

  return trimTrailingSlash(origin);
};

const STATIC_API_BASE_URL = resolveApiBaseUrl();
let resolvedApiBaseUrlPromise = null;

const canUseApiResponse = async (baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/`, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
};

const detectApiBaseUrl = async () => {
  if (typeof window === "undefined") {
    return STATIC_API_BASE_URL;
  }

  const envApiUrl = trimTrailingSlash(import.meta.env.VITE_API_URL || "");
  const { hostname } = window.location;

  if (envApiUrl || hostname === "localhost" || hostname === "127.0.0.1") {
    return STATIC_API_BASE_URL;
  }

  const renderCandidates = buildRenderBackendCandidates(hostname);

  for (const candidate of renderCandidates) {
    if (await canUseApiResponse(candidate)) {
      return candidate;
    }
  }

  return STATIC_API_BASE_URL;
};

const getApiBaseUrl = async () => {
  if (!resolvedApiBaseUrlPromise) {
    resolvedApiBaseUrlPromise = detectApiBaseUrl();
  }

  return resolvedApiBaseUrlPromise;
};

export const API_BASE_URL = STATIC_API_BASE_URL;

const buildPathCandidates = (path) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = [normalizedPath];

  if (!normalizedPath.startsWith("/api/")) {
    candidates.push(`/api${normalizedPath}`);
  }

  return [...new Set(candidates)];
};

const requestWithFallback = async (requestFactory, path, config = {}) => {
  const baseUrl = await getApiBaseUrl();
  const pathCandidates = buildPathCandidates(path);
  let lastError;

  for (const pathCandidate of pathCandidates) {
    try {
      return await requestFactory(`${baseUrl}${pathCandidate}`, config);
    } catch (error) {
      lastError = error;
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError;
};

const apiGet = async (path, config = {}) =>
  requestWithFallback(
    (url, requestConfig) =>
      axios.get(url, {
        timeout: API_TIMEOUT_MS,
        ...requestConfig,
      }),
    path,
    config
  );

const apiPost = async (path, data, config = {}) =>
  requestWithFallback(
    (url, requestConfig) =>
      axios.post(url, data, {
        timeout: API_TIMEOUT_MS,
        ...requestConfig,
      }),
    path,
    config
  );

const apiPut = async (path, data, config = {}) =>
  requestWithFallback(
    (url, requestConfig) =>
      axios.put(url, data, {
        timeout: API_TIMEOUT_MS,
        ...requestConfig,
      }),
    path,
    config
  );

const apiDelete = async (path, config = {}) =>
  requestWithFallback(
    (url, requestConfig) =>
      axios.delete(url, {
        timeout: API_TIMEOUT_MS,
        ...requestConfig,
      }),
    path,
    config
  );

const getStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const createLocalTaskId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const readLocalTasks = () => {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  try {
    const rawValue = storage.getItem(LOCAL_TASKS_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];
    return Array.isArray(parsedValue) ? parsedValue.map(normalizeTask) : [];
  } catch {
    return [];
  }
};

const writeLocalTasks = (tasks) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(LOCAL_TASKS_STORAGE_KEY, JSON.stringify(tasks.map(normalizeTask)));
};

const upsertLocalTask = (task) => {
  const existingTasks = readLocalTasks();
  const normalizedTask = normalizeTask({
    ...task,
    _id: task._id || createLocalTaskId(),
  });
  const nextTasks = [normalizedTask, ...existingTasks.filter((item) => item._id !== normalizedTask._id)];
  writeLocalTasks(nextTasks);
  return normalizedTask;
};

const updateLocalTask = (id, updates) => {
  const nextTasks = readLocalTasks().map((task) =>
    task._id === id ? normalizeTask({ ...task, ...updates, _id: id }) : task
  );
  writeLocalTasks(nextTasks);
  return nextTasks.find((task) => task._id === id) || null;
};

const removeLocalTaskById = (id) => {
  const nextTasks = readLocalTasks().filter((task) => task._id !== id);
  writeLocalTasks(nextTasks);
};

const normalizeDueDate = (dueDate) => {
  if (!dueDate) {
    return "";
  }

  const parsedDate = new Date(dueDate);
  return Number.isNaN(parsedDate.getTime()) ? "" : parsedDate.toISOString();
};

const normalizeTask = (task) => ({
  _id: task._id || createLocalTaskId(),
  title: task.title?.toString().trim() || "Untitled",
  description: task.description?.toString().trim() || "",
  dueDate: normalizeDueDate(task.dueDate),
  completed: Boolean(task.completed),
});

const getErrorMessage = (error, fallbackMessage) =>
  error.response?.data?.message || error.message || fallbackMessage;

export const loadTasks = async () => {
  try {
    const response = await apiGet("/tasks");

    return {
      tasks: Array.isArray(response.data) ? response.data.map(normalizeTask) : [],
      source: "backend",
    };
  } catch (error) {
    return {
      tasks: readLocalTasks(),
      source: "local",
      error: getErrorMessage(
        error,
        "Tasks load nahi ho pa rahe. Backend ya database connection check karo."
      ),
    };
  }
};

export const createTask = async (task) => {
  const normalizedTask = normalizeTask(task);

  try {
    const response = await apiPost("/tasks", normalizedTask);

    return response.data;
  } catch {
    return upsertLocalTask(normalizedTask);
  }
};

export const removeTask = async (id) => {
  try {
    await apiDelete(`/tasks/${id}`);
    return;
  } catch {
    removeLocalTaskById(id);
    return;
  }
};

export const updateTask = async (id, updates) => {
  try {
    const response = await apiPut(`/tasks/${id}`, updates);
    return response.data;
  } catch (error) {
    const updatedTask = updateLocalTask(id, updates);

    if (updatedTask) {
      return updatedTask;
    }

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
      importedTasks.map((task) => apiPost("/tasks", task))
    );

    return {
      importedCount: responses.length,
      message: `${responses.length} tasks database me import ho gaye.`,
      preview,
      source: "backend",
    };
  } catch {
    importedTasks.forEach((task) => {
      upsertLocalTask(task);
    });

    return {
      importedCount: importedTasks.length,
      message: `${importedTasks.length} tasks local storage me save hue.`,
      preview,
      source: "local",
    };
  }
};
