const STORAGE_KEY = "obiettiviGiornalieri";
const CATEGORIES = ["Fisico", "Studio", "Lavoro", "Altro"];
const DEFAULT_CATEGORY = "Altro";
const MAX_RECURRING_TASKS = 366;

const datePicker = document.getElementById("datePicker");
const todayButton = document.getElementById("todayButton");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const taskForm = document.getElementById("taskForm");
const taskInput = document.getElementById("taskInput");
const categorySelect = document.getElementById("categorySelect");
const recurringOptions = document.getElementById("recurringOptions");
const recurringStartDate = document.getElementById("recurringStartDate");
const recurringEndDate = document.getElementById("recurringEndDate");
const weekdayOptions = document.getElementById("weekdayOptions");
const formMessage = document.getElementById("formMessage");
const taskList = document.getElementById("taskList");
const emptyMessage = document.getElementById("emptyMessage");

let tasksByDate = loadTasks();
let selectedDate = getTodayKey();

datePicker.value = selectedDate;
recurringStartDate.value = selectedDate;
recurringEndDate.value = selectedDate;
render();

todayButton.addEventListener("click", () => {
  selectedDate = getTodayKey();
  datePicker.value = selectedDate;
  recurringStartDate.value = selectedDate;
  render();
});

datePicker.addEventListener("change", () => {
  selectedDate = datePicker.value || getTodayKey();
  recurringStartDate.value = selectedDate;
  render();
});

taskForm.addEventListener("change", (event) => {
  if (event.target.matches('input[name="taskType"]')) {
    updateRecurringVisibility();
  }

  if (event.target.matches('input[name="repeatType"]')) {
    updateWeekdayVisibility();
  }
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearFormMessage();

  const text = taskInput.value.trim();
  if (!text) return;

  if (getSelectedTaskType() === "recurring") {
    createRecurringTasks(text, normalizeCategory(categorySelect.value));
    return;
  }

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

  if (event.target.matches(".delete-one-button")) {
    deleteTask(taskId);
  }

  if (event.target.matches(".delete-series-button")) {
    deleteRecurringSeries(taskId);
  }

  if (event.target.matches(".cancel-delete-button")) {
    render();
  }

  if (event.target.matches(".delete-button")) {
    requestDeleteTask(taskId);
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
          category: normalizeCategory(task.category),
          ...(isValidRecurringId(task.recurringId) ? { recurringId: task.recurringId } : {})
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

function createRecurringTasks(text, category) {
  const startDateKey = recurringStartDate.value;
  const endDateKey = recurringEndDate.value;
  const repeatType = getSelectedRepeatType();
  const selectedWeekdays = getSelectedWeekdays();

  if (!isValidDateKey(startDateKey) || !isValidDateKey(endDateKey)) {
    showFormMessage("Seleziona una data inizio e una data fine valide.", "error");
    return;
  }

  if (endDateKey < startDateKey) {
    showFormMessage("La data fine non può essere precedente alla data inizio.", "error");
    return;
  }

  if (repeatType === "weekdays" && selectedWeekdays.length === 0) {
    showFormMessage("Seleziona almeno un giorno della settimana.", "error");
    return;
  }

  const dateKeys = getRecurringDateKeys(startDateKey, endDateKey, repeatType, selectedWeekdays);

  if (dateKeys.length === 0) {
    showFormMessage("Nessuna data corrisponde ai giorni selezionati.", "error");
    return;
  }

  if (dateKeys.length > MAX_RECURRING_TASKS) {
    showFormMessage("Puoi creare al massimo 366 attività ricorrenti alla volta.", "error");
    return;
  }

  const recurringId = createTaskId();

  dateKeys.forEach((dateKey) => {
    ensureTasksForDate(dateKey).push({
      id: createTaskId(),
      text,
      completed: false,
      category,
      recurringId
    });
  });

  taskInput.value = "";
  categorySelect.value = DEFAULT_CATEGORY;
  showFormMessage(`Create ${dateKeys.length} attività ricorrenti.`, "success");
  saveAndRender();
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
  return ensureTasksForDate(selectedDate);
}

function ensureTasksForDate(dateKey) {
  if (!tasksByDate[dateKey]) {
    tasksByDate[dateKey] = [];
  }

  return tasksByDate[dateKey];
}

function findTask(taskId) {
  return getTasksForSelectedDate().find((task) => task.id === taskId);
}

function deleteTask(taskId) {
  tasksByDate[selectedDate] = getTasksForSelectedDate().filter((task) => task.id !== taskId);
  saveAndRender();
}

function requestDeleteTask(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  if (!task.recurringId) {
    deleteTask(taskId);
    return;
  }

  showRecurringDeleteOptions(taskId);
}

function showRecurringDeleteOptions(taskId) {
  const task = findTask(taskId);
  if (!task) return;

  render();

  const taskItem = taskList.querySelector(`[data-id="${taskId}"]`);
  if (!taskItem) return;

  taskItem.classList.add("deleting");
  taskItem.innerHTML = "";

  const message = document.createElement("p");
  message.className = "delete-choice-text";
  message.textContent = "Vuoi eliminare solo questo giorno o tutta la serie?";

  const actions = document.createElement("div");
  actions.className = "delete-choice-actions";

  const oneButton = document.createElement("button");
  oneButton.className = "delete-one-button";
  oneButton.type = "button";
  oneButton.textContent = "Solo questo giorno";

  const seriesButton = document.createElement("button");
  seriesButton.className = "delete-series-button delete-button";
  seriesButton.type = "button";
  seriesButton.textContent = "Tutta la serie";

  const cancelButton = document.createElement("button");
  cancelButton.className = "cancel-delete-button secondary-button";
  cancelButton.type = "button";
  cancelButton.textContent = "Annulla";

  actions.append(oneButton, seriesButton, cancelButton);
  taskItem.append(message, actions);
}

function deleteRecurringSeries(taskId) {
  const task = findTask(taskId);
  if (!task || !task.recurringId) return;

  Object.keys(tasksByDate).forEach((dateKey) => {
    tasksByDate[dateKey] = tasksByDate[dateKey].filter(
      (savedTask) => savedTask.recurringId !== task.recurringId
    );

    if (tasksByDate[dateKey].length === 0) {
      delete tasksByDate[dateKey];
    }
  });

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

  return getDateKey(today);
}

function getRecurringDateKeys(startDateKey, endDateKey, repeatType, selectedWeekdays) {
  const dateKeys = [];
  const currentDate = new Date(`${startDateKey}T00:00:00`);
  const endDate = new Date(`${endDateKey}T00:00:00`);

  while (currentDate <= endDate) {
    if (repeatType === "daily" || selectedWeekdays.includes(currentDate.getDay())) {
      dateKeys.push(getDateKey(currentDate));

      if (dateKeys.length > MAX_RECURRING_TASKS) {
        return dateKeys;
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateKeys;
}

function getSelectedTaskType() {
  return taskForm.querySelector('input[name="taskType"]:checked').value;
}

function getSelectedRepeatType() {
  return taskForm.querySelector('input[name="repeatType"]:checked').value;
}

function getSelectedWeekdays() {
  return Array.from(taskForm.querySelectorAll('input[name="weekdays"]:checked')).map((input) =>
    Number(input.value)
  );
}

function updateRecurringVisibility() {
  const isRecurring = getSelectedTaskType() === "recurring";
  recurringOptions.hidden = !isRecurring;

  if (isRecurring) {
    recurringStartDate.value = selectedDate;
    recurringEndDate.value ||= selectedDate;
  }
}

function updateWeekdayVisibility() {
  weekdayOptions.hidden = getSelectedRepeatType() !== "weekdays";
}

function showFormMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
}

function clearFormMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
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

function isValidRecurringId(recurringId) {
  return typeof recurringId === "string" && recurringId.trim() !== "";
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
