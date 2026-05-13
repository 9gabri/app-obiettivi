const STORAGE_KEY = "obiettiviGiornalieri";

const datePicker = document.getElementById("datePicker");
const todayButton = document.getElementById("todayButton");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");

let tasksByDate = loadTasks();
let selectedDate = getTodayKey();

datePicker.value = selectedDate;
render();

todayButton.addEventListener("click", () => {
  selectedDate = getTodayKey();
  datePicker.value = selectedDate;
  render();
});

datePicker.addEventListener("change", () => {
  selectedDate = datePicker.value || getTodayKey();
  render();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = taskInput.value.trim();
  if (!text) return;

  const task = {
    id: createTaskId(),
    text,
    completed: false
  };

  ensureTasksForSelectedDate().push(task);
  taskInput.value = "";
  saveAndRender();
});

taskList.addEventListener("click", (event) => {
  const taskItem = event.target.closest(".task-item");
  if (!taskItem) return;

  const taskId = taskItem.dataset.id;

  if (event.target.matches(".delete-button")) {
    deleteTask(taskId);
  }

  if (event.target.matches(".edit-button")) {
    editTask(taskId);
  }
});

taskList.addEventListener("change", (event) => {
  if (!event.target.matches(".task-checkbox")) return;

  const taskItem = event.target.closest(".task-item");
  const task = findTask(taskItem.dataset.id);
  if (!task) return;

  task.completed = event.target.checked;
  saveAndRender();
});

// Legge solo dati compatibili e ignora eventuali contenuti corrotti in localStorage.
function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsedTasks = savedTasks ? JSON.parse(savedTasks) : {};

    if (!isPlainObject(parsedTasks)) {
      return {};
    }

    return Object.entries(parsedTasks).reduce((validTasks, [dateKey, tasks]) => {
      if (!isValidDateKey(dateKey) || !Array.isArray(tasks)) {
        return validTasks;
      }

      const cleanTasks = tasks
        .filter(isValidTask)
        .map((task) => ({
          id: task.id,
          text: task.text,
          completed: task.completed
        }));

      if (cleanTasks.length > 0) {
        validTasks[dateKey] = cleanTasks;
      }

      return validTasks;
    }, {});
  } catch {
    return {};
  }
}

function saveTasks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksByDate));
}

function saveAndRender() {
  saveTasks();
  render();
}

// Aggiorna data, progresso e lista delle attivita' mostrate.
function render() {
  const tasks = getTasksForSelectedDate();
  const completedCount = tasks.filter((task) => task.completed).length;
  const progressPercent = tasks.length === 0 ? 0 : (completedCount / tasks.length) * 100;

  selectedDateLabel.textContent = formatDateLabel(selectedDate);
  progressText.textContent = `${completedCount} completate su ${tasks.length}`;
  progressFill.style.width = `${progressPercent}%`;
  emptyMessage.hidden = tasks.length > 0;

  taskList.innerHTML = "";

  tasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = `task-item${task.completed ? " completed" : ""}`;
    item.dataset.id = task.id;

    const checkbox = document.createElement("input");
    checkbox.className = "task-checkbox";
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.setAttribute("aria-label", `Completa ${task.text}`);

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editButton = document.createElement("button");
    editButton.className = "edit-button";
    editButton.type = "button";
    editButton.textContent = "Modifica";

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Elimina";

    actions.append(editButton, deleteButton);
    item.append(checkbox, text, actions);
    taskList.append(item);
  });
}

function getTasksForSelectedDate() {
  return tasksByDate[selectedDate] || [];
}

function ensureTasksForSelectedDate() {
  if (!tasksByDate[selectedDate]) {
    tasksByDate[selectedDate] = [];
  }

  return tasksByDate[selectedDate];
}

function findTask(taskId) {
  return getTasksForSelectedDate().find((task) => task.id === taskId);
}

function deleteTask(taskId) {
  tasksByDate[selectedDate] = getTasksForSelectedDate().filter((task) => task.id !== taskId);
  saveAndRender();
}

// Usa un prompt semplice per mantenere la modifica testuale immediata e senza dipendenze.
function editTask(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  const newText = prompt("Modifica attività", task.text);
  if (newText === null) return;

  const cleanText = newText.trim();
  if (!cleanText) return;

  task.text = cleanText;
  saveAndRender();
}

function getTodayKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);

  return new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function createTaskId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return false;
  }

  const date = new Date(`${dateKey}T00:00:00`);

  return !Number.isNaN(date.getTime()) && dateKey === getDateKey(date);
}

function isValidTask(task) {
  return (
    isPlainObject(task) &&
    typeof task.id === "string" &&
    task.id.trim() !== "" &&
    typeof task.text === "string" &&
    task.text.trim() !== "" &&
    typeof task.completed === "boolean"
  );
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
