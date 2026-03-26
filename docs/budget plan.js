window.onload = function () {
  // -------------------------------
  // Constants & Variables
  // -------------------------------
  const categories = {
    Income: ["Salary", "Allowance", "Freelance", "Gift"],
    Expense: ["Food", "Transport", "Rent", "School Supplies", "Miscellaneous"]
  };

  let transactions = [];
  let budget = { amount: 0, type: "Monthly" };
  let savedTheme = localStorage.getItem("theme") || "light";

  let currentUser = null;
  let transactionsRef, budgetRef;

  // DOM Elements
  const appEl = document.querySelector(".app");
  const budgetForm = document.getElementById("budget-form");
  const budgetInput = document.getElementById("budget-input");
  const budgetDisplay = document.getElementById("budget-display");
  const transactionForm = document.getElementById("transactionForm");
  const typeSelect = document.getElementById("type");
  const categorySelect = document.getElementById("category");
  const transactionTable = document.querySelector("#transaction-table tbody");
  const totalIncomeEl = document.getElementById("total-income");
  const totalExpensesEl = document.getElementById("total-expenses");
  const balanceEl = document.getElementById("balance");
  const themeToggle = document.getElementById("theme-toggle");
  const imgModal = document.getElementById("imgModal");
  const modalImg = document.getElementById("modalImg");

  let incomeExpenseChart, expenseCategoryChart, monthlyChart;

  // Show app immediately (PIN removed)
  appEl.style.display = "block";

  // -------------------------------
  // Theme
  // -------------------------------
  applyTheme(savedTheme);
  themeToggle.addEventListener("click", () => {
    const newTheme = document.body.classList.contains("dark") ? "light" : "dark";
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  });

  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark");
      themeToggle.textContent = "☀️";
    } else {
      document.body.classList.remove("dark");
      themeToggle.textContent = "🌙";
    }
  }

  // -------------------------------
  // Firebase Auth
  // -------------------------------
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return window.location.href = "index.html";
    currentUser = user;

    document.getElementById("logout-btn").addEventListener("click", () => {
      firebase.auth().signOut().then(() => window.location.href = "index.html");
    });

    transactionsRef = firebase.database().ref("users/" + user.uid + "/transactions");
    budgetRef = firebase.database().ref("users/" + user.uid + "/budget");

    const email = user.email;
    document.getElementById("userEmailUI").textContent = " " + email;

    // Load Budget
    budgetRef.on("value", snapshot => {
      budget = snapshot.val() || { amount: 0, type: "Monthly" };
      updateBudgetDisplay();
      updateDashboard();
    });

    // Load Transactions
    transactionsRef.on("value", (snap) => {
      const data = snap.val() || {};
      transactions = Object.keys(data).map(key => {
        const item = data[key] || {};
        return {
          id: key,
          amount: parseFloat(item.amount) || 0,
          type: item.type || "",
          category: item.category || "",
          date: item.date || "",
          note: item.note || "",
          photos: item.photos || []
        };
      });

      renderTransactions();
      updateBudgetDisplay();
      updateDashboard();
      populateCategories();
      renderMonthlySummary();
      renderMonthlyChart();
    });
  });

  // -------------------------------
  // Categories
  // -------------------------------
  typeSelect.addEventListener("change", populateCategories);
  function populateCategories() {
    categorySelect.innerHTML = "";
    categories[typeSelect.value].forEach(cat => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }
  populateCategories(); // Initial population

  // -------------------------------
  // Budget Form
  // -------------------------------
budgetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const amount = parseFloat(budgetInput.value);
  const type = document.querySelector('input[name="budgetType"]:checked').value;

  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid amount.");
    return;
  }

  if (budget && budget.amount) {
    const updateConfirmed = confirm("Update existing budget?");
    if (updateConfirmed) {
      budget.amount += amount;
      budgetRef.set(budget);
      updateBudgetDisplay();
      updateDashboard();
      budgetForm.reset();
      return;
    } else {
      const newConfirmed = confirm("Set new budget?");
      if (newConfirmed) {
        budget = { amount, type };
        budgetRef.set(budget);
        updateBudgetDisplay();
        updateDashboard();
        budgetForm.reset();
      } else {
        return; // do nothing
      }
    }
  } else {
    const newConfirmed = confirm("Set new budget?");
    if (newConfirmed) {
      budget = { amount, type };
      budgetRef.set(budget);
      updateBudgetDisplay();
      updateDashboard();
      budgetForm.reset();
    } else {
      return; // do nothing
    }
  }
});

function updateBudgetDisplay() {
  const base = parseFloat(budget.amount) || 0;
  const income = transactions.filter(t => t.type === "Income")
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const effectiveBudget = base + income;
  budgetDisplay.textContent =
    base > 0 ? `${budget.type} Budget: ₱${effectiveBudget}` : "No budget set";
}







  // -------------------------------
  // Transaction Form
  // -------------------------------
  transactionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const amount = parseFloat(document.getElementById("amount").value);
    const type = typeSelect.value;
    const category = categorySelect.value;
    const note = document.getElementById("note").value;
    const dateInput = document.getElementById("date").value;
    const isoDate = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();

    const transactionData = { amount, type, category, date: isoDate, note, photos: [] };
    transactionsRef.push(transactionData).then(() => alert("✅ Transaction Saved!"));

    transactionForm.reset();
    document.getElementById("transaction-table").scrollIntoView({ behavior: "smooth" });
  });

  // -------------------------------
  // Render Transactions
  // -------------------------------
  function renderTransactions() {
    transactionTable.innerHTML = "";
    transactions.forEach((t) => {
      const photosHTML = (t.photos || []).map((p) => `
        <div class="thumb-container">
          <img src="${p}" class="thumb" onclick="openModal('${p}')">
        </div>
      `).join("");

      const displayDate = t.date
        ? new Date(t.date).toLocaleString("en-PH", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit"
          })
        : "";

      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${displayDate}</td>
        <td>${t.type}</td>
        <td>${t.category}</td>
        <td>₱${t.amount}</td>
        <td>${t.note || ""}${photosHTML}</td>
      `;
      transactionTable.appendChild(row);
    });
  }

  window.openModal = (src) => { modalImg.src = src; imgModal.classList.add("show"); };
  imgModal.addEventListener("click", () => imgModal.classList.remove("show"));

  // -------------------------------
  // Dashboard
  // -------------------------------
  function updateDashboard() {
    const income = transactions.filter(t => t.type === "Income")
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const expenses = transactions.filter(t => t.type === "Expense")
      .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

    const base = parseFloat(budget.amount) || 0;
    const effectiveBudget = base + income;
    const balance = effectiveBudget - expenses;

    totalIncomeEl.textContent = `₱${income}`;
    totalExpensesEl.textContent = `₱${expenses}`;
    balanceEl.textContent = `₱${balance}`;

    if (expenses > effectiveBudget && base > 0) {
      balanceEl.classList.add("over-budget");
    } else {
      balanceEl.classList.remove("over-budget");
    }

    updateCharts(income, expenses);
  }

  function updateCharts(income, expenses) {
    const ctx1 = document.getElementById("incomeExpenseChart").getContext("2d");
    if (incomeExpenseChart) incomeExpenseChart.destroy();
    incomeExpenseChart = new Chart(ctx1, {
      type: "bar",
      data: { labels: ["Income", "Expenses"], datasets: [{ label: "Amount", data: [income, expenses], backgroundColor: ["#16a34a", "#dc2626"] }] }
    });

    const expenseData = {};
    transactions.filter(t => t.type === "Expense")
      .forEach(t => expenseData[t.category] = (expenseData[t.category] || 0) + (parseFloat(t.amount) || 0));

    const ctx2 = document.getElementById("expenseCategoryChart").getContext("2d");
    if (expenseCategoryChart) expenseCategoryChart.destroy();
    expenseCategoryChart = new Chart(ctx2, {
      type: "pie",
      data: {
        labels: Object.keys(expenseData),
        datasets: [{ data: Object.values(expenseData), backgroundColor: ["#f87171","#fb923c","#fbbf24","#34d399","#60a5fa","#a78bfa"] }]
      }
    });
  }

  // -------------------------------
  // Monthly Summary
  // -------------------------------
  function renderMonthlySummary() {
    const monthlyData = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const dateObj = new Date(t.date);
      if (isNaN(dateObj)) return;
      const monthKey = `${dateObj.toLocaleString("en-PH", { month: "long" })} ${dateObj.getFullYear()}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
      if (t.type === "Income") monthlyData[monthKey].income += parseFloat(t.amount) || 0;
      else if (t.type === "Expense") monthlyData[monthKey].expenses += parseFloat(t.amount) || 0;
    });

    const container = document.getElementById("monthly-summary-container");
    container.innerHTML = "";

    Object.keys(monthlyData).sort((a, b) => new Date("1 " + a) - new Date("1 " + b))
      .forEach(month => {
        const { income, expenses } = monthlyData[month];

        const section = document.createElement("div");
        section.classList.add("monthly-block");
        section.innerHTML = `
          <h3>${month}</h3>
          <table class="monthly-summary-table">
            <thead>
              <tr><th>Income</th><th>Expenses</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>₱${income.toFixed(2)}</td>
                <td>₱${expenses.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        `;
        container.appendChild(section);
      });
  }

  function renderMonthlyChart() {
    const monthlyData = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const dateObj = new Date(t.date);
      if (isNaN(dateObj)) return;
      const monthKey = `${dateObj.toLocaleString("en-PH", { month: "long" })} ${dateObj.getFullYear()}`;
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expenses: 0 };
      if (t.type === "Income") monthlyData[monthKey].income += parseFloat(t.amount) || 0;
      else if (t.type === "Expense") monthlyData[monthKey].expenses += parseFloat(t.amount) || 0;
    });

    const months = Object.keys(monthlyData).sort((a, b) => new Date("1 " + a) - new Date("1 " + b));
    const incomes = months.map(m => monthlyData[m].income);
    const expenses = months.map(m => monthlyData[m].expenses);

    const ctx = document.getElementById("monthlyChart").getContext("2d");
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(ctx, {
      type: "bar",
      data: { labels: months, datasets: [{ label: "Income", data: incomes, backgroundColor: "#16a34a" }, { label: "Expenses", data: expenses, backgroundColor: "#dc2626" }] },
      options: { responsive: true, plugins: { legend: { position: "top" } }, scales: { y: { beginAtZero: true } } }
    });
  }

  // -------------------------------
  // Menu
  // -------------------------------
  const menu = document.querySelector(".menu");
  if (menu) {
    const menuBtn = menu.querySelector("button");
    menuBtn.addEventListener("click", () => menu.classList.toggle("show"));
    window.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) menu.classList.remove("show");
    });
  }
};
