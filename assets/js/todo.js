const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskList = document.getElementById("taskList");
const taskCounter = document.getElementById("taskCounter");

let currentFilter = "all";

// Charger les tâches depuis le localStorage au démarrage
window.onload = () => {
  loadTasks();
  updateCounter();
};

function addTask() {
  const taskText = taskInput.value.trim();
  const dueDate = taskDate.value;

  if (taskText === "") return;

  createTaskElement(taskText, dueDate, false);
  saveTasks();

  taskInput.value = "";
  taskDate.value = "";
}

function createTaskElement(text, dueDate, completed) {
  const li = document.createElement("li");

  const span = document.createElement("span");
  span.textContent = text + (dueDate ? ` (📅 ${dueDate})` : "");
  if (completed) li.classList.add("completed");

  // Vérifier si la tâche est en retard
  if (dueDate) {
    const today = new Date().toISOString().split("T")[0];
    if (dueDate < today && !completed) {
      li.classList.add("overdue");
    }
  }

  span.onclick = () => {
    li.classList.toggle("completed");
    saveTasks();
    updateCounter();
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "❌";
  deleteBtn.classList.add("delete");
  deleteBtn.onclick = () => {
    li.remove();
    saveTasks();
    updateCounter();
  };

  li.appendChild(span);
  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

// Sauvegarde les tâches dans le localStorage
function saveTasks() {
  const tasks = [];
  document.querySelectorAll("#taskList li").forEach(li => {
    const text = li.querySelector("span").textContent;
    const regex = /(.*)\s\(📅\s(.+)\)$/;
    let match = text.match(regex);

    tasks.push({
      text: match ? match[1] : text,
      dueDate: match ? match[2] : "",
      completed: li.classList.contains("completed")
    });
  });

  // Tri par date avant sauvegarde
  tasks.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  localStorage.setItem("tasks", JSON.stringify(tasks));
  loadTasks(); // recharger pour appliquer le tri
}

// Recharge les tâches depuis le localStorage
function loadTasks() {
  taskList.innerHTML = "";
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach(task => createTaskElement(task.text, task.dueDate, task.completed));
  updateCounter();
}

// Mettre à jour le compteur
function updateCounter() {
  const tasks = document.querySelectorAll("#taskList li");
  const remaining = [...tasks].filter(li => !li.classList.contains("completed")).length;
  taskCounter.textContent = `${remaining} tâche${remaining > 1 ? "s" : ""} à faire`;
}

// Filtrer les tâches
function filterTasks(filter) {
  currentFilter = filter;
  const tasks = document.querySelectorAll("#taskList li");

  tasks.forEach(li => {
    const isCompleted = li.classList.contains("completed");
    if (filter === "all") {
      li.style.display = "flex";
    } else if (filter === "active") {
      li.style.display = isCompleted ? "none" : "flex";
    } else if (filter === "completed") {
      li.style.display = isCompleted ? "flex" : "none";
    }
  });
}
