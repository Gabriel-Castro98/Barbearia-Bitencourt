// Mock bookings data
const mockBookings = [
  {
    id: 1,
    name: "João Silva",
    service: "Corte Clássico - R$ 45",
    barber: "Carlos Bitencourt",
    date: "2024-01-15",
    time: "10:00",
    status: "pending",
    phone: "(11) 98765-4321",
    email: "joao@email.com",
  },
  {
    id: 2,
    name: "Pedro Santos",
    service: "Barba Completa - R$ 40",
    barber: "Ricardo Silva",
    date: "2024-01-15",
    time: "11:00",
    status: "confirmed",
    phone: "(11) 98765-1234",
    email: "pedro@email.com",
  },
  {
    id: 3,
    name: "Lucas Oliveira",
    service: "Pacote Premium - R$ 75",
    barber: "Fernando Santos",
    date: "2024-01-15",
    time: "14:00",
    status: "confirmed",
    phone: "(11) 98765-5678",
    email: "lucas@email.com",
  },
  {
    id: 4,
    name: "Carlos Mendes",
    service: "Corte Clássico - R$ 45",
    barber: "Carlos Bitencourt",
    date: "2024-01-15",
    time: "15:00",
    status: "completed",
    phone: "(11) 98765-9012",
    email: "carlos@email.com",
  },
  {
    id: 5,
    name: "Rafael Costa",
    service: "Barba Completa - R$ 40",
    barber: "Ricardo Silva",
    date: "2024-01-15",
    time: "16:00",
    status: "pending",
    phone: "(11) 98765-3456",
    email: "rafael@email.com",
  },
]

// Load bookings from localStorage or use mock data
let bookings = JSON.parse(localStorage.getItem("bookings") || JSON.stringify(mockBookings))

// Render bookings table
function renderBookings(filter = "all") {
  const tbody = document.getElementById("bookings-table")
  if (!tbody) return

  const filteredBookings = filter === "all" ? bookings : bookings.filter((b) => b.status === filter)

  tbody.innerHTML = filteredBookings
    .map(
      (booking) => `
        <tr class="hover:bg-zinc-800/50">
            <td class="px-6 py-4">
                <div class="font-medium">${booking.name}</div>
                <div class="text-sm text-zinc-400">${booking.phone}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm">${booking.service.split(" - ")[0]}</div>
                <div class="text-sm text-amber-500">${booking.service.split(" - ")[1]}</div>
            </td>
            <td class="px-6 py-4">${booking.barber}</td>
            <td class="px-6 py-4">
                <div>${new Date(booking.date).toLocaleDateString("pt-BR")}</div>
                <div class="text-sm text-zinc-400">${booking.time}</div>
            </td>
            <td class="px-6 py-4">
                <span class="status-badge status-${booking.status} px-3 py-1 rounded-full text-xs font-semibold">
                    ${getStatusText(booking.status)}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2">
                    ${
                      booking.status === "pending"
                        ? `
                        <button onclick="updateStatus(${booking.id}, 'confirmed')" class="text-green-500 hover:text-green-400" title="Confirmar">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    `
                        : ""
                    }
                    ${
                      booking.status === "confirmed"
                        ? `
                        <button onclick="updateStatus(${booking.id}, 'completed')" class="text-blue-500 hover:text-blue-400" title="Concluir">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                            </svg>
                        </button>
                    `
                        : ""
                    }
                    <button onclick="deleteBooking(${booking.id})" class="text-red-500 hover:text-red-400" title="Cancelar">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `,
    )
    .join("")
}

function getStatusText(status) {
  const statusMap = {
    pending: "Pendente",
    confirmed: "Confirmado",
    completed: "Concluído",
    cancelled: "Cancelado",
  }
  return statusMap[status] || status
}

function updateStatus(id, newStatus) {
  bookings = bookings.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
  localStorage.setItem("bookings", JSON.stringify(bookings))
  renderBookings()
}

function deleteBooking(id) {
  if (confirm("Tem certeza que deseja cancelar este agendamento?")) {
    bookings = bookings.filter((b) => b.id !== id)
    localStorage.setItem("bookings", JSON.stringify(bookings))
    renderBookings()
  }
}

function filterBookings(filter) {
  // Update active button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("active")
  })
  event.target.classList.add("active")

  renderBookings(filter)
}

// Add CSS for status badges
const style = document.createElement("style")
style.textContent = `
    .status-pending {
        background-color: rgba(234, 179, 8, 0.1);
        color: rgb(234, 179, 8);
    }
    .status-confirmed {
        background-color: rgba(34, 197, 94, 0.1);
        color: rgb(34, 197, 94);
    }
    .status-completed {
        background-color: rgba(59, 130, 246, 0.1);
        color: rgb(59, 130, 246);
    }
    .status-cancelled {
        background-color: rgba(239, 68, 68, 0.1);
        color: rgb(239, 68, 68);
    }
`
document.head.appendChild(style)

// Initial render
renderBookings()
