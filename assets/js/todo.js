const taskInput = document.getElementById("taskInput");
const taskList = document.getElementById("taskList");

// Charger les tâches depuis le localStorage au démarrage
window.onload = () => {
  loadTasks();
};

function addTask() {
  const taskText = taskInput.value.trim();
  if (taskText === "") return;

  createTaskElement(taskText, false);
  saveTasks();

  taskInput.value = "";
}

function createTaskElement(text, completed) {
  const li = document.createElement("li");

  const span = document.createElement("span");
  span.textContent = text;
  if (completed) li.classList.add("completed");

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
    tasks.push({
      text: li.querySelector("span").textContent,
      completed: li.classList.contains("completed")
    });
  });
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Recharge les tâches depuis le localStorage
function loadTasks() {
  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  tasks.forEach(task => createTaskElement(task.text, task.completed));
}
