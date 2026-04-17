const { v4: uuidv4 } = require("uuid");
const { getCache, setCache } = require("./cache");
const logger = require("./logger");

// Task operations
const OPERATIONS = ["analyze", "compare", "roast", "gap_analysis", "interview_readiness"];

// In-memory task store (Redis-backed when available)
const taskStore = new Map();

function createTask(userId, operation, input) {
  if (!OPERATIONS.includes(operation)) throw new Error(`Invalid operation. Must be one of: ${OPERATIONS.join(", ")}`);
  const task = {
    id: uuidv4(),
    userId,
    operation,
    input,
    status: "pending",
    result: null,
    error: null,
    logs: [`[${new Date().toISOString()}] Task created: ${operation}`],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  taskStore.set(task.id, task);
  return task;
}

function getTask(taskId) {
  return taskStore.get(taskId) || null;
}

function getUserTasks(userId) {
  return [...taskStore.values()].filter((t) => t.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function updateTask(taskId, updates) {
  const task = taskStore.get(taskId);
  if (!task) return null;
  const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
  taskStore.set(taskId, updated);
  return updated;
}

function addLog(taskId, message) {
  const task = taskStore.get(taskId);
  if (!task) return;
  task.logs.push(`[${new Date().toISOString()}] ${message}`);
  task.updatedAt = new Date().toISOString();
  taskStore.set(taskId, task);
}

// SSE clients per task
const sseClients = new Map();

function addSSEClient(taskId, res) {
  if (!sseClients.has(taskId)) sseClients.set(taskId, new Set());
  sseClients.get(taskId).add(res);
}

function removeSSEClient(taskId, res) {
  sseClients.get(taskId)?.delete(res);
}

function broadcastTaskUpdate(taskId) {
  const task = taskStore.get(taskId);
  if (!task) return;
  const clients = sseClients.get(taskId);
  if (!clients?.size) return;
  const data = `data: ${JSON.stringify(task)}\n\n`;
  clients.forEach((res) => {
    try { res.write(data); } catch { clients.delete(res); }
  });
}

module.exports = { createTask, getTask, getUserTasks, updateTask, addLog, addSSEClient, removeSSEClient, broadcastTaskUpdate, OPERATIONS };
