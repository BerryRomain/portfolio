const taskInput = document.getElementById("taskInput");
const taskDate = document.getElementById("taskDate");
const taskList = document.getElementById("taskList");

// Charger les tâches depuis le localStorage au démarrage
window.onload = () => {
  loadTasks();
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
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "❌";
  deleteBtn.classList.add("delete");
  deleteBtn.onclick = () => {
    li.remove();
    saveTasks();
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
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Recharge les tâches depuis le localStorage
function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach(task => createTaskElement(task.text, task.dueDate, task.completed));
}
