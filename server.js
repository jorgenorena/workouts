import http from "node:http";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = __dirname;
const appRoot = path.join(repoRoot, "app");
const workoutsRoot = path.join(repoRoot, "workouts");

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Method not allowed." });
      return;
    }

    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    const routePath = decodeURIComponent(requestUrl.pathname);

    if (routePath === "/api/workouts") {
      const workouts = await listWorkoutFiles(workoutsRoot);
      sendJson(response, 200, workouts);
      return;
    }

    if (routePath === "/") {
      await serveFile(response, path.join(appRoot, "index.html"));
      return;
    }

    if (routePath.startsWith("/app/")) {
      await serveFromRoot(response, appRoot, routePath.slice("/app/".length));
      return;
    }

    if (routePath.startsWith("/workouts/")) {
      await serveFromRoot(response, workoutsRoot, routePath.slice("/workouts/".length));
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    const statusCode = error?.statusCode || 500;
    sendJson(response, statusCode, {
      error: error instanceof Error ? error.message : "Unexpected server error.",
    });
  }
});

server.listen(port, host, () => {
  console.log(`Workout app server running at http://${host}:${port}`);
});

async function serveFromRoot(response, rootDir, relativePath) {
  const absolutePath = safeResolve(rootDir, relativePath);

  if (!absolutePath) {
    throw createHttpError(403, "Invalid path.");
  }

  await serveFile(response, absolutePath);
}

async function serveFile(response, absolutePath) {
  let fileBuffer;

  try {
    fileBuffer = await readFile(absolutePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw createHttpError(404, "File not found.");
    }

    throw error;
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";

  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(fileBuffer);
}

async function listWorkoutFiles(rootDir) {
  const jsonFiles = await walkJsonFiles(rootDir);
  const workouts = [];

  for (const absolutePath of jsonFiles) {
    const relativePath = toPosixPath(path.relative(rootDir, absolutePath));
    const rawContent = await readFile(absolutePath, "utf8");
    const parsedContent = JSON.parse(rawContent);

    workouts.push({
      path: `/workouts/${relativePath}`,
      relativePath: `workouts/${relativePath}`,
      name: typeof parsedContent.name === "string" && parsedContent.name.trim() !== ""
        ? parsedContent.name.trim()
        : path.basename(relativePath, ".json"),
      sourceFormat: Array.isArray(parsedContent.sections)
        ? "sections"
        : Array.isArray(parsedContent.workout)
          ? "legacy-workout"
          : "unknown",
    });
  }

  workouts.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return workouts;
}

async function walkJsonFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkJsonFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".json")) {
      files.push(entryPath);
    }
  }

  return files;
}

function safeResolve(rootDir, relativePath) {
  const rootPath = path.resolve(rootDir);
  const requestPath = relativePath.replace(/^\/+/, "");
  const absolutePath = path.resolve(rootPath, requestPath);

  if (absolutePath === rootPath || absolutePath.startsWith(`${rootPath}${path.sep}`)) {
    return absolutePath;
  }

  return null;
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload, null, 2));
}
