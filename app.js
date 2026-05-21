// ============================================================
// GLOBALS — находим элементы HTML и создаём хранилища данных
// ============================================================

const todoList = document.getElementById('todo-list'); // список задач в HTML
const userSelect = document.getElementById('user-todo'); // выпадающий список пользователей
const form = document.querySelector('form'); // форма добавления задачи
let todos = []; // сюда загрузим задачи с сервера
let users = []; // сюда загрузим пользователей с сервера


// ============================================================
// ATTACH LOGIC — навешиваем обработчики событий
// ============================================================

// когда HTML полностью загрузился — запускаем приложение
document.addEventListener('DOMContentLoaded', initApp);

// когда пользователь отправляет форму — обрабатываем
form.addEventListener('submit', handleSubmit);


// ============================================================
// BASIC LOGIC — вспомогательные функции
// ============================================================

// находит имя пользователя по его id
// принимает: userId — число
// возвращает: строку с именем пользователя
function getUserName(userId) {
  const user = users.find(u => u.id === userId); // ищем в массиве users пользователя с нужным id
  return user.name; // возвращаем его имя
}

// создаёт и добавляет одну задачу в DOM
// принимает объект задачи — сразу деструктурируем нужные поля
function printTodo({ id, userId, title, completed }) {
  const li = document.createElement('li'); // создаём элемент списка
  li.className = 'todo-item'; // даём класс для стилей
  li.dataset.id = id; // сохраняем id задачи прямо в HTML-элементе
                      // потом через element.dataset.id сможем его достать

  // вставляем текст задачи и имя автора
  li.innerHTML = `<span>${title} <i>by</i> <b>${getUserName(userId)}</b></span>`;

  // создаём чекбокс для отметки выполнения
  const status = document.createElement('input');
  status.type = 'checkbox';
  status.checked = completed; // если задача выполнена — чекбокс сразу отмечен
  status.addEventListener('change', handleTodoChange); // при изменении — отправляем на сервер

  // создаём крестик для удаления задачи
  const close = document.createElement('span');
  close.innerHTML = '&times;'; // символ × 
  close.className = 'close';
  close.addEventListener('click', handleClose); // при клике — удаляем задачу

  li.prepend(status); // чекбокс ставим в начало li
  li.append(close);   // крестик ставим в конец li

  todoList.prepend(li); // новую задачу добавляем в НАЧАЛО списка
}

// создаёт один пункт в выпадающем списке пользователей
// принимает: объект пользователя
function createUserOption(user) {
  const option = document.createElement('option');
  option.value = user.id;       // значение которое отправится при выборе этого пользователя
  option.innerText = user.name; // текст который видит пользователь в списке
  userSelect.append(option);    // добавляем в select
}

// удаляет задачу из массива todos и из DOM
// принимает: todoId — id задачи которую удаляем
function removeTodo(todoId) {
  // убираем задачу из массива todos
  todos = todos.filter((todo) => todo.id !== todoId);

  // находим элемент li в DOM по data-атрибуту
  const todo = todoList.querySelector(`[data-id="${todoId}"]`);

  // снимаем обработчики событий перед удалением
  // это важно — иначе они останутся в памяти даже после удаления элемента
  todo.querySelector('input').removeEventListener('change', handleTodoChange);
  todo.querySelector('.close').removeEventListener('click', handleClose);

  todo.remove(); // удаляем элемент из DOM
}

// показывает ошибку пользователю
function alertError(error) {
  alert(error.message);
}


// ============================================================
// EVENT LOGIC — обработчики событий
// ============================================================

// запускается когда страница загрузилась
// загружает задачи и пользователей с сервера одновременно
function initApp() {
  // Promise.all запускает оба запроса ОДНОВРЕМЕННО
  // и ждёт пока ОБА завершатся — это быстрее чем по очереди
  Promise.all([getAllTodos(), getAllUsers()]).then(values => {
    [todos, users] = values; // деструктуризация — первый результат в todos, второй в users

    todos.forEach((todo) => printTodo(todo));   // отрисовываем каждую задачу
    users.forEach((user) => createUserOption(user)); // заполняем список пользователей
  });
}

// срабатывает когда пользователь отмечает/снимает чекбокс
function handleTodoChange() {
  const todoId = this.parentElement.dataset.id; // this = чекбокс, parentElement = li
                                                // достаём id из data-атрибута li
  const completed = this.checked; // true если отмечен, false если нет

  toggleTodoComplete(todoId, completed); // отправляем изменение на сервер
}

// срабатывает когда пользователь нажимает крестик
function handleClose() {
  const todoId = this.parentElement.dataset.id; // this = крестик, parentElement = li
  deleteTodo(todoId); // удаляем задачу на сервере
}

// срабатывает когда пользователь отправляет форму
function handleSubmit(event) {
  event.preventDefault(); // отменяем стандартное поведение браузера
                          // без этого страница перезагрузится при отправке формы

  createTodo({
    userId: Number(form.user.value), // Number() потому что value всегда строка, нам нужно число
    title: form.todo.value,          // текст задачи из поля ввода
    completed: false,                // новая задача всегда не выполнена
  });
}


// ============================================================
// ASYNC LOGIC — работа с сервером
// ============================================================

// получает список задач с сервера
// возвращает: массив объектов задач
async function getAllTodos() {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=15');
  // ?_limit=15 — параметр запроса, говорит серверу "дай только 15 штук"
  const data = await response.json(); // превращаем ответ из текста в JS объект
  return data;
}

// получает список пользователей с сервера
// возвращает: массив объектов пользователей
async function getAllUsers() {
  const response = await fetch('https://jsonplaceholder.typicode.com/users?_limit=15');
  const data = await response.json();
  return data;
}

// создаёт новую задачу на сервере
// принимает: объект todo с полями userId, title, completed
async function createTodo(todo) {
  const response = await fetch('https://jsonplaceholder.typicode.com/todos', {
    method: 'POST',                    // POST — создать новый ресурс на сервере
    body: JSON.stringify(todo),        // данные которые отправляем — обязательно строкой
    headers: { 'Content-Type': 'application/json' }, // говорим серверу что отправляем JSON
  });

  const newTodo = await response.json(); // сервер возвращает созданную задачу с новым id
  printTodo(newTodo); // отрисовываем её в DOM
}

// меняет статус выполнения задачи на сервере
// принимает: todoId — id задачи, completed — true/false
async function toggleTodoComplete(todoId, completed) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${todoId}`, {
    method: 'PATCH',                      // PATCH — обновить часть данных (не весь объект)
    body: JSON.stringify({ completed }),  // отправляем только поле completed
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    // если сервер вернул ошибку — откатываем изменение в DOM
    alertError(new Error('Не удалось изменить статус задачи'));
  }
}

// удаляет задачу на сервере
// принимает: todoId — id задачи которую удаляем
async function deleteTodo(todoId) {
  const response = await fetch(`https://jsonplaceholder.typicode.com/todos/${todoId}`, {
    method: 'DELETE', // DELETE — удалить ресурс на сервере
    headers: { 'Content-Type': 'application/json' },
  });

  if (response.ok) {
    // удаляем из DOM только если сервер подтвердил удаление
    removeTodo(todoId);
  }
}