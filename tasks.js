// VARIABLES ---------------------
let currentTaskId = null;
let projects = [];

document.addEventListener("DOMContentLoaded", () => {
    load_tasks();
    load_projects();
});

// DRAG - DROP ------------------
function allowDrop(ev) {
    ev.preventDefault();
}
function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}
function drop(ev) {
    ev.preventDefault();
    let data = ev.dataTransfer.getData("text");
    let task = document.getElementById(data);
    if (task && ev.target.classList.contains("column")) {
        let fromColumn = task.parentElement.id;
        let toColumn = ev.target.id;
        ev.target.appendChild(task);
        save_tasks();
        log_status_change(task, fromColumn, toColumn);
    }
}

// NUEVA TAREA ------------------
function new_task() {
    let input = document.getElementById("task_input");
    let text = input.value.trim();
    if (text === "") return;

    let id = "task-" + Date.now();
    let task = create_task_el(id, text);

    document.getElementById("pendiente").appendChild(task);
    input.value = "";
    save_tasks();
}

// CREAR ELEMENTO --------------
function create_task_el(id, text) {
    let task = document.createElement("div");
    task.id = id;
    task.className = "task p-2 border rounded shadow-sm mb-2";
    task.draggable = true;
    task.ondragstart = drag;

    let title = document.createElement("span");
    title.textContent = text;

    let editBtn = document.createElement("button");
    editBtn.innerHTML = "✏️";
    editBtn.className = "edit-btn ms-2";
    editBtn.onclick = () => open_edit_modal(id, text);

    let deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = "❌";
    deleteBtn.className = "delete-btn ms-2";
    deleteBtn.onclick = () => delete_task(id);

    task.appendChild(title);
    task.appendChild(editBtn);
    task.appendChild(deleteBtn);

    return task;
}

// ELIMINAR TAREA --------------
function delete_task(id) {
    let task = document.getElementById(id);
    if (task) {
        task.remove();
        save_tasks();
    }
}

// GUARDAR TAREAS --------------
function save_tasks() {
    let columns = document.querySelectorAll(".column");
    let data = {};
    columns.forEach(col => {
        data[col.id] = [...col.children].filter(task => task.id.startsWith("task-")).map(task => ({
            id: task.id,
            text: task.querySelector("span").textContent,
            due_date: task.getAttribute("data-due-date") || null,
            subtasks: task.subtaskData || [],
            project: task.getAttribute("data-project") || ""
        }));
    });
    localStorage.setItem("kanban", JSON.stringify(data));
}

// CARGAR TAREAS ---------------
function load_tasks() {
    let data = JSON.parse(localStorage.getItem("kanban")) || {};
    for (let col in data) {
        let column = document.getElementById(col);
        data[col].forEach(taskData => {
            let task = create_task_el(taskData.id, taskData.text);
            if (taskData.due_date) task.setAttribute("data-due-date", taskData.due_date);
            if (taskData.project) task.setAttribute("data-project", taskData.project);
            task.subtaskData = taskData.subtasks || [];
            column.appendChild(task);
        });
    }
}

// MODAL EDITAR ----------------
function open_edit_modal(taskId, taskText) {
    currentTaskId = taskId;
    let task = document.getElementById(taskId);

    document.getElementById("edit_due_date").value = task.getAttribute("data-due-date") || "";
    document.getElementById("new_subtask_input").value = "";
    document.getElementById("edit_subtasks_list").innerHTML = "";

    (task.subtaskData || []).forEach(sub => add_subtask_to_modal(sub));

    let project = task.getAttribute("data-project") || "";
    let projectSelect = document.getElementById("project_select");
    projectSelect.value = project || "";

    new bootstrap.Modal(document.getElementById("editModal")).show();
}

// SUBTAREAS MODAL -------------
function add_modal_subtask() {
    let input = document.getElementById("new_subtask_input");
    let text = input.value.trim();
    if (text === "") return;
    add_subtask_to_modal(text);
    input.value = "";
}

function add_subtask_to_modal(text) {
    let li = document.createElement("li");
    li.className = "list-group-item subtask";
    li.textContent = text;
    document.getElementById("edit_subtasks_list").appendChild(li);
}

// GUARDAR MODAL ---------------
function save_modal_changes() {
    if (!currentTaskId) return;

    let task = document.getElementById(currentTaskId);

    let dueDate = document.getElementById("edit_due_date").value;
    if (dueDate) task.setAttribute("data-due-date", dueDate);
    else task.removeAttribute("data-due-date");

    task.subtaskData = [];
    document.querySelectorAll("#edit_subtasks_list .subtask").forEach(li => {
        task.subtaskData.push(li.textContent);
    });

    let project = document.getElementById("project_select").value;
    if (project) task.setAttribute("data-project", project);
    else task.removeAttribute("data-project");

    save_tasks();
    document.querySelector("#editModal .btn-close").click();
}

// LOG HISTORIAL --------------
function log_status_change(task, fromColumn, toColumn) {
    let taskText = task.querySelector("span").textContent;
    let project = task.getAttribute("data-project") || "Sin proyecto";
    let timestamp = new Date().toLocaleString();
    let history = JSON.parse(localStorage.getItem("kanban_status_history")) || [];

    let logEntry = `${timestamp}: La tarea "${taskText}" del proyecto "${project}" pasó de "${fromColumn}" a "${toColumn}"`;
    history.unshift(logEntry); // Insertar al inicio
    localStorage.setItem("kanban_status_history", JSON.stringify(history));
}

// CARGAR HISTORIAL -----------
function load_status_history() {
    const history = JSON.parse(localStorage.getItem("kanban_status_history")) || [];
    const list = document.getElementById("history_list");
    list.innerHTML = "";

    history.forEach(item => {
        const li = document.createElement("li");
        li.className = "list-group-item";
        li.textContent = item;
        list.appendChild(li);
    });
}

// MODAL HISTORIAL ------------
function open_history_modal() {
    load_status_history();
    new bootstrap.Modal(document.getElementById("historyModal")).show();
}

// BORRAR HISTORIAL -----------
function clear_history() {
    if (confirm("¿Seguro que quieres borrar todo el historial?")) {
        localStorage.removeItem("kanban_status_history");
        load_status_history();
    }
}

// PROYECTOS -------------------
function add_project() {
    let projectName = prompt("Nombre del nuevo proyecto:");
    if (projectName && !projects.includes(projectName)) {
        projects.push(projectName);
        save_projects();
        load_projects();
    }
}
function save_projects() {
    localStorage.setItem("kanban_projects", JSON.stringify(projects));
}
function load_projects() {
    projects = JSON.parse(localStorage.getItem("kanban_projects")) || [];
    let select = document.getElementById("project_select");
    select.innerHTML = `<option value="">Sin proyecto</option>`;
    projects.forEach(p => {
        let opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
}
