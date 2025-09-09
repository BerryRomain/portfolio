const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskList = document.getElementById("taskList");
const taskCounter = document.getElementById("taskCounter");
const searchInput = document.getElementById("searchInput");

let currentFilter = "all";

// Charger les tâches depuis le localStorage au démarrage
window.onload = () => {
  loadTasks();
  updateCounter();
};

// Ajouter une tâche
function addTask() {
  const taskText = taskInput.value.trim();
  const dueDate = taskDate.value;

  if (taskText === "") return;

  createTaskElement(taskText, dueDate, false);
  saveTasks();

  taskInput.value = "";
  taskDate.value = "";
}

// Créer un élément de tâche
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

  // Bouton édition
  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";
  editBtn.classList.add("edit");
  editBtn.onclick = () => {
    const newText = prompt("Modifier la tâche :", text);
    if (newText) {
      span.textContent = newText + (dueDate ? ` (📅 ${dueDate})` : "");
      saveTasks();
    }
  };

  // Bouton suppression
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "❌";
  deleteBtn.classList.add("delete");
  deleteBtn.onclick = () => {
    li.remove();
    saveTasks();
    updateCounter();
  };

  li.appendChild(span);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);
  taskList.appendChild(li);
}

// Sauvegarder les tâches
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

// Charger les tâches
function loadTasks() {
  taskList.innerHTML = "";
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach(task => createTaskElement(task.text, task.dueDate, task.completed));
  updateCounter();

  filterTasks(currentFilter);
}

// Compteur
function updateCounter() {
  const tasks = document.querySelectorAll("#taskList li");
  const remaining = [...tasks].filter(li => !li.classList.contains("completed")).length;
  taskCounter.textContent = `${remaining} tâche${remaining > 1 ? "s" : ""} à faire`;
}

// Filtres
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

// Supprimer toutes les tâches terminées
function clearCompleted() {
  document.querySelectorAll("#taskList li.completed").forEach(li => li.remove());
  saveTasks();
  updateCounter();
}

// Recherche dynamique
searchInput.addEventListener("input", () => {
  const query = searchInput.value.toLowerCase();
  document.querySelectorAll("#taskList li").forEach(li => {
    const text = li.querySelector("span").textContent.toLowerCase();
    li.style.display = text.includes(query) ? "flex" : "none";
  });
});
