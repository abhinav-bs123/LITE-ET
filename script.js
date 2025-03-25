// Initialize Chart.js
let expenseChart;
let dailyExpenseChart;

// User data storage
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = null;
let expenses = JSON.parse(localStorage.getItem('expenses')) || {};

// DOM Elements
const authContainer = document.getElementById('authContainer');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const registerFormElement = document.getElementById('registerFormElement');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const logoutBtn = document.getElementById('logoutBtn');
const expenseForm = document.getElementById('expenseForm');
const expensesList = document.getElementById('expensesList');
const dailyLimitInput = document.getElementById('dailyLimit');
const expenseDateInput = document.getElementById('expenseDate');

// Set default date to today
expenseDateInput.valueAsDate = new Date();

// Auth Functions
function showRegisterForm() {
    document.querySelector('.auth-form').style.display = 'none';
    registerForm.style.display = 'block';
}

function showLoginForm() {
    registerForm.style.display = 'none';
    document.querySelector('.auth-form').style.display = 'block';
}

function register(e) {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (users.find(user => user.email === email)) {
        alert('Email already registered!');
        return;
    }

    users.push({ name, email, password });
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registration successful! Please login.');
    showLoginForm();
    registerFormElement.reset();
}

function login(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const user = users.find(user => user.email === email && user.password === password);
    if (user) {
        currentUser = user;
        authContainer.style.display = 'none';
        dashboard.style.display = 'block';
        loadUserData();
    } else {
        alert('Invalid credentials!');
    }
}

function logout() {
    currentUser = null;
    dashboard.style.display = 'none';
    authContainer.style.display = 'flex';
    document.getElementById('loginForm').reset();
}

// Expense Functions
function loadUserData() {
    if (!expenses[currentUser.email]) {
        expenses[currentUser.email] = {
            dailyLimit: 0,
            expenses: [],
            currentMonth: new Date().toISOString().slice(0, 7) // Store current month (YYYY-MM)
        };
    }
    dailyLimitInput.value = expenses[currentUser.email].dailyLimit;
    updateExpensesList();
    updateCharts();
}

function addExpense(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const description = document.getElementById('expenseDescription').value;
    const date = document.getElementById('expenseDate').value;

    // Check if the expense is for a new month
    const expenseMonth = date.slice(0, 7);
    if (expenseMonth !== expenses[currentUser.email].currentMonth) {
        if (confirm('This expense is for a new month. Would you like to start tracking expenses for this month?')) {
            expenses[currentUser.email].currentMonth = expenseMonth;
            expenses[currentUser.email].expenses = []; // Reset expenses for new month
        } else {
            return; // Cancel adding expense
        }
    }

    const expense = {
        amount,
        category,
        description,
        date
    };

    expenses[currentUser.email].expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    updateExpensesList();
    updateCharts();
    expenseForm.reset();
    expenseDateInput.valueAsDate = new Date(); // Reset date to today
}

function updateExpensesList() {
    const currentMonth = expenses[currentUser.email].currentMonth;
    const monthExpenses = expenses[currentUser.email].expenses.filter(
        expense => expense.date.startsWith(currentMonth)
    );

    expensesList.innerHTML = '';
    let total = 0;

    // Sort expenses by date
    monthExpenses.sort((a, b) => new Date(a.date) - new Date(b.date));

    monthExpenses.forEach(expense => {
        total += expense.amount;
        const expenseElement = document.createElement('div');
        expenseElement.className = `expense-item ${total > expenses[currentUser.email].dailyLimit ? 'over-limit' : 'under-limit'}`;
        expenseElement.innerHTML = `
            <span>${new Date(expense.date).toLocaleDateString('en-IN')} - ${expense.category}: ${expense.description}</span>
            <span>₹${expense.amount.toFixed(2)}</span>
        `;
        expensesList.appendChild(expenseElement);
    });

    // Add total at the bottom
    if (monthExpenses.length > 0) {
        const totalElement = document.createElement('div');
        totalElement.className = `expense-item ${total > expenses[currentUser.email].dailyLimit ? 'over-limit' : 'under-limit'}`;
        totalElement.style.fontWeight = 'bold';
        totalElement.innerHTML = `
            <span>Monthly Total</span>
            <span>₹${total.toFixed(2)}</span>
        `;
        expensesList.appendChild(totalElement);
    }
}

function updateCharts() {
    updatePieChart();
    updateDailyExpenseChart();
}

function updatePieChart() {
    const currentMonth = expenses[currentUser.email].currentMonth;
    const categories = {};
    expenses[currentUser.email].expenses
        .filter(expense => expense.date.startsWith(currentMonth))
        .forEach(expense => {
            categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
        });

    if (expenseChart) {
        expenseChart.destroy();
    }

    const ctx = document.getElementById('expenseChart').getContext('2d');
    expenseChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(categories),
            datasets: [{
                data: Object.values(categories),
                backgroundColor: [
                    '#FF6384',
                    '#36A2EB',
                    '#FFCE56',
                    '#4BC0C0',
                    '#9966FF',
                    '#FF9F40'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

function updateDailyExpenseChart() {
    const currentMonth = expenses[currentUser.email].currentMonth;
    const [year, month] = currentMonth.split('-');
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const monthExpenses = expenses[currentUser.email].expenses.filter(
        expense => expense.date.startsWith(currentMonth)
    );

    const dailyTotals = Array.from({length: daysInMonth}, (_, i) => {
        const date = `${currentMonth}-${String(i + 1).padStart(2, '0')}`;
        return monthExpenses
            .filter(expense => expense.date === date)
            .reduce((sum, expense) => sum + expense.amount, 0);
    });

    if (dailyExpenseChart) {
        dailyExpenseChart.destroy();
    }

    const ctx = document.getElementById('dailyExpenseChart').getContext('2d');
    dailyExpenseChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({length: daysInMonth}, (_, i) => i + 1),
            datasets: [{
                label: 'Daily Expenses',
                data: dailyTotals,
                backgroundColor: '#1a73e8',
                borderColor: '#1557b0',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₹' + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `₹${context.raw.toFixed(2)}`;
                        }
                    }
                }
            }
        }
    });
}

// Event Listeners
showRegister.addEventListener('click', showRegisterForm);
showLogin.addEventListener('click', showLoginForm);
registerFormElement.addEventListener('submit', register);
loginForm.addEventListener('submit', login);
logoutBtn.addEventListener('click', logout);
expenseForm.addEventListener('submit', addExpense);
dailyLimitInput.addEventListener('change', (e) => {
    expenses[currentUser.email].dailyLimit = parseFloat(e.target.value);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    updateExpensesList();
}); 