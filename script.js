const STORAGE_KEY = "obiettiviGiornalieri";
const CATEGORIES = ["Fisico", "Studio", "Lavoro", "Altro"];
const DEFAULT_CATEGORY = "Altro";

const datePicker = document.getElementById("datePicker");
const todayButton = document.getElementById("todayButton");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const categorySelect = document.getElementById("categorySelect");
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
    completed: false,
    category: normalizeCategory(categorySelect.value)
  };

  ensureTasksForSelectedDate().push(task);
  taskInput.value = "";
  categorySelect.value = DEFAULT_CATEGORY;
  saveAndRender();
});

taskList.addEventListener("click", (event) => {
  const taskItem = event.target.closest(".task-item");
  if (!taskItem) return;

  const taskId = taskItem.dataset.id;

  if (event.target.matches(".save-edit-button")) {
    saveEditedTask(taskItem);
  }

  if (event.target.matches(".cancel-edit-button")) {
    render();
  }

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
          completed: task.completed,
          category: normalizeCategory(task.category)
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

  CATEGORIES.forEach((category) => {
    const categoryTasks = tasks.filter((task) => normalizeCategory(task.category) === category);
    if (categoryTasks.length === 0) return;

    const group = document.createElement("li");
    group.className = "category-group";

    const title = document.createElement("h3");
    title.className = "category-title";
    title.textContent = category;

    const groupList = document.createElement("ul");
    groupList.className = "category-task-list";

    categoryTasks.forEach((task) => {
      groupList.append(createTaskElement(task));
    });

    group.append(title, groupList);
    taskList.append(group);
  });
}

function createTaskElement(task) {
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
  return item;
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

// Mostra un piccolo form inline per modificare testo e categoria.
function editTask(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  render();

  const taskItem = taskList.querySelector(`[data-id="${taskId}"]`);
  if (!taskItem) return;

  taskItem.classList.add("editing");
  taskItem.innerHTML = "";

  const editInput = document.createElement("input");
  editInput.className = "edit-input";
  editInput.type = "text";
  editInput.value = task.text;
  editInput.setAttribute("aria-label", "Testo attivita");

  const editCategory = document.createElement("select");
  editCategory.className = "edit-category";
  editCategory.setAttribute("aria-label", "Categoria attivita");

  CATEGORIES.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = normalizeCategory(task.category) === category;
    editCategory.append(option);
  });

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const saveButton = document.createElement("button");
  saveButton.className = "save-edit-button";
  saveButton.type = "button";
  saveButton.textContent = "Salva";

  const cancelButton = document.createElement("button");
  cancelButton.className = "cancel-edit-button secondary-button";
  cancelButton.type = "button";
  cancelButton.textContent = "Annulla";

  actions.append(saveButton, cancelButton);
  taskItem.append(editInput, editCategory, actions);
  editInput.focus();
}

function saveEditedTask(taskItem) {
  const task = findTask(taskItem.dataset.id);
  if (!task) return;

  const editInput = taskItem.querySelector(".edit-input");
  const editCategory = taskItem.querySelector(".edit-category");
  const cleanText = editInput.value.trim();

  if (!cleanText) {
    editInput.focus();
    return;
  }

  task.text = cleanText;
  task.category = normalizeCategory(editCategory.value);
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

function normalizeCategory(category) {
  return CATEGORIES.includes(category) ? category : DEFAULT_CATEGORY;
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
