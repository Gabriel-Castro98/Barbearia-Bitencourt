// Mobile menu toggle
const mobileMenuBtn = document.getElementById("mobile-menu-btn")
const mobileMenu = document.getElementById("mobile-menu")

if (mobileMenuBtn) {
  mobileMenuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("hidden")
  })
}

// Booking form multi-step
let currentStep = 1

function nextStep(step) {
  const currentStepEl = document.getElementById(`step-${currentStep}`)
  const nextStepEl = document.getElementById(`step-${step}`)

  // Validate current step
  const inputs = currentStepEl.querySelectorAll("input[required], select[required]")
  let isValid = true

  inputs.forEach((input) => {
    if (
      !input.value ||
      (input.type === "radio" && !currentStepEl.querySelector(`input[name="${input.name}"]:checked`))
    ) {
      isValid = false
      input.classList.add("border-red-500")
    } else {
      input.classList.remove("border-red-500")
    }
  })

  if (!isValid) {
    alert("Por favor, preencha todos os campos obrigatórios.")
    return
  }

  currentStepEl.classList.add("hidden")
  nextStepEl.classList.remove("hidden")
  currentStep = step

  window.scrollTo({ top: 0, behavior: "smooth" })
}

function prevStep(step) {
  document.getElementById(`step-${currentStep}`).classList.add("hidden")
  document.getElementById(`step-${step}`).classList.remove("hidden")
  currentStep = step

  window.scrollTo({ top: 0, behavior: "smooth" })
}

// Booking form submission
const bookingForm = document.getElementById("booking-form")
if (bookingForm) {
  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(bookingForm)
    const data = Object.fromEntries(formData)

    console.log("[v0] Booking data:", data)

    // Save to localStorage (simulating backend)
    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]")
    bookings.push({
      id: Date.now(),
      ...data,
      status: "pending",
      createdAt: new Date().toISOString(),
    })
    localStorage.setItem("bookings", JSON.stringify(bookings))

    showToast()

    setTimeout(() => {
      window.location.href = "index.html"
    }, 2000)
  })
}

// Login form
const loginForm = document.getElementById("login-form")
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(loginForm)
    const data = Object.fromEntries(formData)

    console.log("[v0] Login data:", data)

    // Simulate login
    localStorage.setItem("user", JSON.stringify({ email: data.email }))

    alert("Login realizado com sucesso!")
    window.location.href = "index.html"
  })
}

// Signup form
const signupForm = document.getElementById("signup-form")
if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(signupForm)
    const data = Object.fromEntries(formData)

    if (data.password !== data["confirm-password"]) {
      alert("As senhas não coincidem!")
      return
    }

    console.log("[v0] Signup data:", data)

    // Simulate signup
    localStorage.setItem(
      "user",
      JSON.stringify({
        name: data.name,
        email: data.email,
        phone: data.phone,
      }),
    )

    alert("Conta criada com sucesso!")
    window.location.href = "login.html"
  })
}

// Contact form
const contactForm = document.getElementById("contact-form")
if (contactForm) {
  contactForm.addEventListener("submit", (e) => {
    e.preventDefault()

    const formData = new FormData(contactForm)
    const data = Object.fromEntries(formData)

    console.log("[v0] Contact data:", data)

    showToast()
    contactForm.reset()
  })
}

// FAQ accordion
const faqQuestions = document.querySelectorAll(".faq-question")
faqQuestions.forEach((question) => {
  question.addEventListener("click", () => {
    const faqItem = question.parentElement
    const answer = faqItem.querySelector(".faq-answer")

    // Close other FAQs
    document.querySelectorAll(".faq-item").forEach((item) => {
      if (item !== faqItem) {
        item.classList.remove("active")
        item.querySelector(".faq-answer").classList.add("hidden")
      }
    })

    // Toggle current FAQ
    faqItem.classList.toggle("active")
    answer.classList.toggle("hidden")
  })
})

// Toast notification
function showToast() {
  const toast = document.getElementById("toast")
  if (toast) {
    toast.classList.remove("hidden")
    setTimeout(() => {
      toast.classList.add("hidden")
    }, 3000)
  }
}

// Set minimum date for booking
const dateInput = document.querySelector('input[type="date"]')
if (dateInput) {
  const today = new Date().toISOString().split("T")[0]
  dateInput.setAttribute("min", today)
}
