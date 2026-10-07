// Mock Data / Local Storage Connection
let dispatchData = JSON.parse(localStorage.getItem('fleetRequests'));

if (!dispatchData) {
    dispatchData = [
        {
            id: 'REQ-92',
            requestor: 'PHILIP MCLEAN O. SOBERANO',
            destination: 'PICK UP AT NAIA TERMINAL 3 TO VICTORIA TOWERS, TIMOG AVENUE, QUEZON CITY',
            purpose: 'ARRIVAL IN PHILIPPINES',
            scheduleDate: '2026-08-01',
            scheduleTime: '08:30 - 01:30',
            driver: '',
            car: '',
            status: 'pending'
        }
    ];
    localStorage.setItem('fleetRequests', JSON.stringify(dispatchData));
}

const drivers = [
    { id: 'd1', name: 'Randy Sayon' },
    { id: 'd2', name: 'Hilarion Garcia' },
    { id: 'd3', name: 'Ryan Guna' }
];

const cars = [
    { id: 'c1', name: 'Toyota Innova - NHM-3386' },
    { id: 'c2', name: 'Nissan Urvan - NKI-95017' }
];

// Elements
const tableBody = document.getElementById('dispatch-table-body');
const dateInput = document.getElementById('schedule-date');
const btnToday = document.getElementById('btn-today');
const scheduleHeaderText = document.getElementById('schedule-header-text');
const scheduleContent = document.getElementById('schedule-content');

// Formatting utilities
const formatDateStr = (date) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
};

// Initialize
function init() {
    renderTable();
    setupScheduleBoard();

    // Auto-refresh when request form submits in another tab
    window.addEventListener('storage', (e) => {
        if (e.key === 'fleetRequests') {
            dispatchData = JSON.parse(e.newValue);
            renderTable();
        }
    });
}

function renderTable() {
    tableBody.innerHTML = '';

    dispatchData.forEach(row => {
        const tr = document.createElement('tr');

        // Driver Options
        const driverOptions = `<option value="" disabled selected>Select</option>` +
            drivers.map(d => `<option value="${d.id}" ${row.driver === d.id ? 'selected' : ''}>${d.name}</option>`).join('');

        // Car Options
        const carOptions = `<option value="" disabled selected>Select</option>` +
            cars.map(c => `<option value="${c.id}" ${row.car === c.id ? 'selected' : ''}>${c.name}</option>`).join('');

        tr.innerHTML = `
            <td><strong>${row.id}</strong></td>
            <td class="requestor-cell">${row.requestor}</td>
            <td class="destination-cell">${row.destination}</td>
            <td><span class="purpose-cell">${row.purpose}</span></td>
            <td class="schedule-cell">
                <span class="schedule-date">${row.scheduleDate}</span>
                <span class="schedule-time">${row.scheduleTime}</span>
            </td>
            <td>
                <select class="driver-select" data-id="${row.id}">
                    ${driverOptions}
                </select>
            </td>
            <td>
                <select class="car-select" data-id="${row.id}">
                    ${carOptions}
                </select>
            </td>
            <td>
                <select class="status-select" data-id="${row.id}">
                    <option value="pending" ${row.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="approved" ${row.status === 'approved' ? 'selected' : ''}>Approved</option>
                </select>
            </td>
            <td>
                <button class="btn btn-primary" onclick="saveRow('${row.id}')">Save</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function setupScheduleBoard() {
    // Set initial date (from the screenshot it's June 11, 2026, but we can set it to today)
    const today = new Date();
    // format YYYY-MM-DD
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    dateInput.value = `${yyyy}-${mm}-${dd}`;
    updateScheduleHeader(today);

    dateInput.addEventListener('change', (e) => {
        if (e.target.value) {
            updateScheduleHeader(new Date(e.target.value));
        }
    });

    btnToday.addEventListener('click', () => {
        dateInput.value = `${yyyy}-${mm}-${dd}`;
        updateScheduleHeader(new Date());
    });
}

function updateScheduleHeader(date) {
    // Check if valid date
    if (isNaN(date.getTime())) return;
    scheduleHeaderText.textContent = formatDateStr(date);

    scheduleContent.innerHTML = `
        <div class="empty-state">
            <i class="fa-regular fa-calendar-xmark empty-state-icon"></i>
            <p>No Schedule</p>
        </div>
    `;
}

// Global scope for onclick
window.saveRow = (id) => {
    // Get current values from the selects
    const driver = document.querySelector(`.driver-select[data-id="${id}"]`).value;
    const car = document.querySelector(`.car-select[data-id="${id}"]`).value;
    const status = document.querySelector(`.status-select[data-id="${id}"]`).value;

    // Update data array and localStorage
    const index = dispatchData.findIndex(d => d.id === id);
    if (index !== -1) {
        dispatchData[index].driver = driver;
        dispatchData[index].car = car;
        dispatchData[index].status = status;
        localStorage.setItem('fleetRequests', JSON.stringify(dispatchData));
    }

    // Add visual feedback
    const btn = document.querySelector(`button[onclick="saveRow('${id}')"]`);
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    btn.style.backgroundColor = '#10b981'; // Green
    btn.style.color = 'white';

    // Update the row status color dynamically without full re-render
    if (status === 'approved') {
        btn.parentElement.previousElementSibling.querySelector('.status-select').style.borderColor = '#22c55e';
    } else {
        btn.parentElement.previousElementSibling.querySelector('.status-select').style.borderColor = '';
    }

    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = '';
        btn.style.color = '';
    }, 2000);

    console.log('Saved row', id);
};

init();
