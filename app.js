// API Base URL
const API_URL = '/api/tasks';

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const taskInput = document.getElementById('task-input');
    const prioritySelect = document.getElementById('priority-select');
    const taskDate = document.getElementById('task-date');
    const addBtn = document.getElementById('add-btn');
    const taskList = document.getElementById('task-list');
    const completedList = document.getElementById('completed-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const dateDisplay = document.getElementById('date-display');

    // Filter Elements
    const filterStart = document.getElementById('filter-start');
    const filterEnd = document.getElementById('filter-end');
    const searchBtn = document.getElementById('search-btn');
    const resetSearchBtn = document.getElementById('reset-search-btn');
    const historyDetails = document.getElementById('history-details');

    // Init Date and Defaults
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const today = new Date();
    dateDisplay.textContent = today.toLocaleDateString('ko-KR', options);
    taskDate.valueAsDate = new Date();

    // Initial Load
    fetchTasks();

    // Event Listeners
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Search clicked: ', filterStart.value, '~', filterEnd.value);
        fetchTasks();
        // Close the details menu so user can see results
        if (historyDetails) historyDetails.removeAttribute('open');
    });

    resetSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        filterStart.value = '';
        filterEnd.value = '';
        fetchTasks();
        if (historyDetails) historyDetails.removeAttribute('open');
    });

    clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // --- API Functions ---

    async function fetchTasks() {
        // Show loading state if needed
        // taskList.style.opacity = '0.5';

        try {
            const response = await fetch(API_URL);
            const json = await response.json();

            if (json.data) {
                let tasks = json.data;

                // Client-side filtering
                const start = filterStart.value; // YYYY-MM-DD
                const end = filterEnd.value;     // YYYY-MM-DD

                if (start || end) {
                    tasks = tasks.filter(task => {
                        // Compare task.date (Target Date)
                        // If user wants to filter by Creation Date instead, swap this logic.
                        // "History Record" usually implies past target dates or creation. 
                        // Let's assume Target Date as that's the primary date property.
                        const taskDate = task.date;

                        // Tasks without dates are filtered out if a range is set
                        if (!taskDate) return false;

                        if (start && taskDate < start) return false;
                        if (end && taskDate > end) return false;
                        return true;
                    });
                }

                // Sort
                tasks.sort((a, b) => {
                    if (a.completed !== b.completed) return a.completed ? 1 : -1;
                    return b.id - a.id;
                });

                renderTasks(tasks);
                updateTaskCount(tasks);
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            // Fallback UI
            taskList.innerHTML = `<li style="padding:1rem; text-align:center; color:red;">Error loading tasks. Is server running?</li>`;
        } finally {
            // taskList.style.opacity = '1';
        }
    }

    async function addTask() {
        const text = taskInput.value.trim();
        const targetDate = taskDate.value;
        const priority = prioritySelect.value;
        const createdAt = new Date().toISOString();

        if (text === '') return;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    date: targetDate,
                    priority: priority,
                    createdAt: createdAt
                })
            });

            if (response.ok) {
                fetchTasks(); // Reload
                taskInput.value = '';
                taskInput.focus();
            }
        } catch (error) {
            console.error('Error adding task:', error);
        }
    }

    async function toggleTask(id, currentStatus) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus })
            });

            if (response.ok) {
                fetchTasks();
            }
        } catch (error) {
            console.error('Error updating task:', error);
        }
    }

    async function updateTaskContent(id, newText, newDate, newPriority) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: newText, date: newDate, priority: newPriority })
            });

            if (response.ok) {
                fetchTasks();
            }
        } catch (error) {
            console.error('Error updating task content:', error);
        }
    }

    async function deleteTask(id) {
        const taskElement = document.querySelector(`[data-id="${id}"]`);
        if (taskElement) {
            taskElement.style.transform = 'translateX(100px)';
            taskElement.style.opacity = '0';
        }

        setTimeout(async () => {
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    fetchTasks();
                }
            } catch (error) {
                console.error('Error deleting task:', error);
            }
        }, 300);
    }

    async function clearCompletedTasks() {
        try {
            const response = await fetch(API_URL);
            const json = await response.json();
            const tasks = json.data;
            const completedTasks = tasks.filter(t => t.completed);

            await Promise.all(completedTasks.map(task =>
                fetch(`${API_URL}/${task.id}`, { method: 'DELETE' })
            ));

            fetchTasks();
        } catch (error) {
            console.error('Error clearing tasks:', error);
        }
    }

    function updateTaskCount(tasks) {
        const activeCount = tasks.filter(t => !t.completed).length;
        taskCount.textContent = `${activeCount} 개의 할일 남음`;
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        completedList.innerHTML = '';

        const activeTasks = tasks.filter(task => !task.completed);
        const completedTasks = tasks.filter(task => task.completed);

        // Render Active
        if (activeTasks.length === 0) {
            if (filterStart.value || filterEnd.value) {
                taskList.innerHTML = `
                    <li style="text-align: center; color: var(--text-muted); padding: 1rem; grid-column: 1 / -1; display: block; font-size: 0.9rem;">
                        <i class="fas fa-search" style="margin-bottom: 0.5rem; opacity: 0.5;"></i>
                        <p>해당 기간에 할 일이 없습니다.</p>
                    </li>
                `;
            } else {
                taskList.innerHTML = `
                    <li style="text-align: center; color: var(--text-muted); padding: 2rem; grid-column: 1 / -1; display: block; font-size: 0.9rem;">
                        <i class="fas fa-magic" style="font-size: 2rem; margin-bottom: 0.5rem; opacity: 0.3;"></i>
                        <p>할 일을 추가해보세요!</p>
                    </li>
                `;
            }
        } else {
            activeTasks.forEach(task => taskList.appendChild(createTaskElement(task)));
        }

        // Render Completed
        completedTasks.forEach(task => completedList.appendChild(createTaskElement(task)));

        const completedSection = document.querySelector('.completed-section');
        completedSection.style.display = completedTasks.length > 0 ? 'block' : 'none';
    }

    function createTaskElement(task) {
        const li = document.createElement('li');
        const priorityClass = `priority-${task.priority || 'low'}`;
        li.className = `task-item ${task.completed ? 'completed' : ''} ${priorityClass}`;
        li.setAttribute('data-id', task.id);

        const dateBadge = task.date ?
            `<span class="task-date-badge">${task.date}</span>` :
            `<span class="task-date-badge no-date"></span>`;

        let createdDisplay = '';
        if (task.createdAt) {
            const createdDate = new Date(task.createdAt);
            if (!isNaN(createdDate.getTime())) {
                const timeString = createdDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
                const dateString = createdDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
                createdDisplay = `<span class="created-at"><i class="far fa-clock"></i> 입력: ${dateString} ${timeString}</span>`;
            }
        }

        li.innerHTML = `
            <div class="checkbox-col">
                <div class="custom-checkbox">
                    <i class="fas fa-check"></i>
                </div>
            </div>
            
            <div class="text-col">
                <span class="task-text">${escapeHtml(task.text)}</span>
                ${createdDisplay}
            </div>
            
            <div class="date-col">
                ${dateBadge}
            </div>

            <div class="task-actions" style="position: absolute; right: 2px; top: 50%; transform: translateY(-50%); display:flex; gap: 5px;">
                <button class="edit-btn" title="수정"><i class="fas fa-pen"></i></button>
                <button class="delete-btn" title="삭제" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;

        const checkbox = li.querySelector('.custom-checkbox');
        checkbox.addEventListener('click', () => toggleTask(task.id, task.completed));

        // Text click to edit? Or just keep it view-only until edit button clicked.
        // Let's keep toggle on text click for now, but disable it if in edit mode (handled by replacing element).
        const textCol = li.querySelector('.text-col');
        textCol.addEventListener('click', () => toggleTask(task.id, task.completed));

        const editBtn = li.querySelector('.edit-btn');
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            enableEditMode(li, task);
        });

        const deleteBtn = li.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTask(task.id);
        });

        return li;
    }

    function enableEditMode(li, task) {
        // Hide existing views
        li.querySelector('.text-col').style.display = 'none';
        li.querySelector('.date-col').style.display = 'none';
        li.querySelector('.task-actions').style.display = 'none';

        // Create edit UI
        const editGroup = document.createElement('div');
        editGroup.className = 'edit-mode-group';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'edit-input-text';
        input.value = task.text;

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'edit-input-date';
        dateInput.value = task.date || '';

        const priorityEdit = document.createElement('select');
        priorityEdit.innerHTML = `
            <option value="low">낮음</option>
            <option value="medium">보통</option>
            <option value="high">높음</option>
        `;
        priorityEdit.value = task.priority || 'low';
        priorityEdit.style.background = '#1e293b';
        priorityEdit.style.color = 'white';
        priorityEdit.style.border = '1px solid #334155';
        priorityEdit.style.borderRadius = '4px';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.innerHTML = '<i class="fas fa-check"></i>';

        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'cancel-btn';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';

        editGroup.appendChild(input);
        editGroup.appendChild(priorityEdit);
        editGroup.appendChild(dateInput);
        editGroup.appendChild(saveBtn);
        editGroup.appendChild(cancelBtn);

        // Insert edit group at correct position (replacing text-col effectively in grid)
        // Grid is: 35px 1fr 80px. editGroup should span grid columns 2 and 3 potentially.
        // Actually, let's just append it and absolute position or change grid?
        // Easier: replace everything inside LI temporarily.
        // Or cleaner: make LI display:flex for edit mode.

        li.classList.add('editing');
        li.style.display = 'flex'; // Overlay or flex behavior
        li.style.alignItems = 'center';
        li.innerHTML = '';
        li.appendChild(editGroup);

        input.focus();

        // Handlers
        const save = async () => {
            const newText = input.value.trim();
            const newDate = dateInput.value;
            const newPriority = priorityEdit.value;
            if (newText) {
                await updateTaskContent(task.id, newText, newDate, newPriority);
            }
        };

        const cancel = () => {
            fetchTasks(); // Helper to re-render simply
        };

        saveBtn.addEventListener('click', (e) => { e.stopPropagation(); save(); });
        cancelBtn.addEventListener('click', (e) => { e.stopPropagation(); cancel(); });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') cancel();
        });
    }

    function escapeHtml(text) {
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
});
