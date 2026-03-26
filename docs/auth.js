const loginEmailEl = document.getElementById("loginEmail");
const loginPasswordEl = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");

const registerNameEl = document.getElementById("registerName");
const registerEmailEl = document.getElementById("registerEmail");
const registerPasswordEl = document.getElementById("registerPassword");
const registerConfirmPasswordEl = document.getElementById("registerConfirmPassword");
const termsCheckboxEl = document.getElementById("termsCheckbox");
const registerBtn = document.getElementById("registerBtn");

const toRegister = document.getElementById("toRegister");
const toLogin = document.getElementById("toLogin");

// ==== Password Toggle Helpers ====
function setupShowPass(checkboxId, inputId) {
  const checkbox = document.getElementById(checkboxId);
  const input = document.getElementById(inputId);
  checkbox.addEventListener("change", () => {
    input.type = checkbox.checked ? "text" : "password";
  });
}
setupShowPass("showLoginPass", "loginPassword");
setupShowPass("showRegisterPass", "registerPassword");
setupShowPass("showConfirmPass", "registerConfirmPassword");

// ==== Switch Forms ====
function showRegister() {
  document.getElementById("loginForm").classList.remove("active");
  document.getElementById("registerForm").classList.add("active");
  localStorage.setItem("authForm", "register"); // save state
}
function showLogin() {
  document.getElementById("registerForm").classList.remove("active");
  document.getElementById("loginForm").classList.add("active");
  localStorage.setItem("authForm", "login"); // save state
}
toRegister.addEventListener("click", showRegister);
toLogin.addEventListener("click", showLogin);

// ==== Restore form on refresh ====
window.addEventListener("load", () => {
  const savedForm = localStorage.getItem("authForm") || "login";
  if (savedForm === "register") {
    showRegister();
  } else {
    showLogin();
  }
});


// ==== LOGIN ====
loginBtn.addEventListener("click", (e) => {
  e.preventDefault(); // prevent form reload

  const email = loginEmailEl.value.trim();
  const password = loginPasswordEl.value;

  if (!email || !password) {
    alert("❌ Please enter email and password.");
    return;
  }

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Mark that the user just logged in (skip lockscreen first time)
      localStorage.setItem(`justLoggedIn_${user.uid}`, "true");

      window.location.href = "budget plan.html";
    })
    .catch((error) => {
      console.error("Login error:", error.code, error.message);

      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        alert("❌ Invalid email or password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        alert("❌ Please enter a valid email address.");
      } else {
        alert("❌ " + (error.message || "Login failed."));
      }
    });
});




// ==== REGISTER ====
registerBtn.addEventListener("click", () => {
  const name = registerNameEl.value.trim();
  const email = registerEmailEl.value.trim();
  const password = registerPasswordEl.value;
  const confirmPassword = registerConfirmPasswordEl.value;

  if (!name || !email || !password || !confirmPassword) {
    alert(" Please fill in all fields.");
    return;
  }
  if (password !== confirmPassword) {
    alert(" Passwords do not match.");
    return;
  }


  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then(() => {
      alert(" Account created. You can now log in.");
      showLogin();
    })
    .catch((error) => {
      console.error("Registration error:", error.code);

      if (error.code === "auth/email-already-in-use") {
        alert(" This email is already registered. Try logging in.");
      } else if (error.code === "auth/weak-password") {
        alert(" Password should be at least 6 characters.");
      } else if (error.code === "auth/invalid-email") {
        alert("Please enter a valid email address.");
      } else {
        alert("❌ " + (error.message || "Registration failed"));
      }
    });
});
