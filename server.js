let currentOrderId = null;
let currentDeliveryDate = null;
let currentProductName = null;
let currentVariantId = null;
let currentMobileNumber = null;
let selectedDate = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
const today = new Date();
const minSelectableDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);

let rescheduleRequests = JSON.parse(localStorage.getItem('rescheduleRequests')) || [];

function hasRescheduleRequest(orderId, variantId) {
    return rescheduleRequests.find(
        request => request.orderId === orderId && request.variantId === variantId
    );
}

function addRescheduleRequest(orderId, variantId, status, requestedDeliveryDate) {
    rescheduleRequests.push({ orderId, variantId, status, requestedDeliveryDate });
    localStorage.setItem('rescheduleRequests', JSON.stringify(rescheduleRequests));
}

function openModal(orderId, deliveryDate, productName, variantId, mobileNumber) {
    currentOrderId = orderId;
    currentDeliveryDate = deliveryDate;
    currentProductName = productName;
    currentVariantId = variantId;
    currentMobileNumber = mobileNumber;

    const existingRequest = hasRescheduleRequest(orderId, variantId);
    if (existingRequest) {
        const rescheduleMessage = document.getElementById('reschedule-message');
        rescheduleMessage.textContent = `A rescheduling request was placed for this item on ${existingRequest.requestedDeliveryDate || 'unknown date'}. Do you want to reschedule it again?`;
        document.getElementById('reschedule-confirmation-overlay').style.display = 'flex';
        return;
    }

    selectedDate = null;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('selected-date').style.display = 'none';
    document.getElementById('selected-date').className = 'message';
    renderCalendar();
    console.log('Opening modal with:', { orderId, deliveryDate, productName, variantId, mobileNumber });
}

function confirmRescheduleYes() {
    document.getElementById('reschedule-confirmation-overlay').style.display = 'none';
    selectedDate = null;
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('selected-date').style.display = 'none';
    document.getElementById('selected-date').className = 'message';
    renderCalendar();
}

function confirmRescheduleNo() {
    document.getElementById('reschedule-confirmation-overlay').style.display = 'none';
}

function closeModal() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('selected-date').style.display = 'none';
    selectedDate = null;
}

function closeConfirmationModal() {
    document.getElementById('confirmation-modal-overlay').style.display = 'none';
}

function showLoader() {
    document.getElementById('loader-modal').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loader-modal').style.display = 'none';
}

function prevMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

function renderCalendar() {
    try {
        const calendarGrid = document.getElementById('calendar-grid');
        const monthYear = document.getElementById('calendar-month-year');
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        monthYear.textContent = `${months[currentMonth]} ${currentYear}`;

        calendarGrid.innerHTML = '';

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'day disabled';
            calendarGrid.appendChild(emptyDay);
        }

        for (let day = 1; day <= lastDate; day++) {
            const dayElement = document.createElement('div');
            const currentDate = new Date(Date.UTC(currentYear, currentMonth, day));
            const isDisabled = currentDate < minSelectableDate;
            dayElement.className = `day ${isDisabled ? 'disabled' : ''}`;
            dayElement.textContent = day;
            if (!isDisabled) {
                dayElement.onclick = () => selectDate(day);
            }
            calendarGrid.appendChild(dayElement);
        }

        if (selectedDate) {
            const selectedDay = new Date(selectedDate).getUTCDate();
            const selectedMonth = new Date(selectedDate).getUTCMonth();
            const selectedYear = new Date(selectedDate).getUTCFullYear();
            if (selectedMonth === currentMonth && selectedYear === currentYear) {
                const days = calendarGrid.querySelectorAll('.day:not(.disabled)');
                days.forEach(day => {
                    if (parseInt(day.textContent) === selectedDay) {
                        day.classList.add('selected');
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error rendering calendar:', error);
    }
}

function selectDate(day) {
    try {
        const selectedDateObj = new Date(Date.UTC(currentYear, currentMonth, day));
        if (selectedDateObj < minSelectableDate) {
            console.warn('Attempted to select disabled date:', selectedDateObj);
            return;
        }
        selectedDate = selectedDateObj.toISOString().split('T')[0];
        console.log('Selected date (raw):', selectedDateObj, 'Formatted:', selectedDate);
        const days = document.getElementById('calendar-grid').querySelectorAll('.day:not(.disabled)');
        days.forEach(d => d.classList.remove('selected'));
        event.target.classList.add('selected');
        const selectedDateDisplay = document.getElementById('selected-date');
        selectedDateDisplay.textContent = `Selected Date: ${selectedDate}`;
        selectedDateDisplay.className = 'message success-message';
        selectedDateDisplay.style.display = 'block';
    } catch (error) {
        console.error('Error selecting date:', error);
        const selectedDateDisplay = document.getElementById('selected-date');
        selectedDateDisplay.textContent = 'Error selecting date';
        selectedDateDisplay.className = 'message error-message';
        selectedDateDisplay.style.display = 'block';
    }
}

async function confirmDate() {
    const selectedDateDisplay = document.getElementById('selected-date');
    const confirmationModal = document.getElementById('confirmation-modal-overlay');
    const confirmationDetails = document.getElementById('confirmation-details');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationIcon = document.getElementById('confirmation-icon');
    const confirmationModalElement = confirmationModal.querySelector('.confirmation-modal');

    if (!selectedDate) {
        selectedDateDisplay.textContent = 'Please select a date';
        selectedDateDisplay.className = 'message error-message';
        selectedDateDisplay.style.display = 'block';
        return;
    }

    if (!currentMobileNumber || !/^\d{10}$/.test(currentMobileNumber)) {
        selectedDateDisplay.textContent = 'Invalid mobile number';
        selectedDateDisplay.className = 'message error-message';
        selectedDateDisplay.style.display = 'block';
        return;
    }

    showLoader();

    const payload = [
        {
            orderId: currentOrderId,
            rescheduleRequests: [
                {
                    variantId: currentVariantId,
                    currentDeliveryDate: currentDeliveryDate,
                    requestedDeliveryDate: selectedDate,
                    mobileNumber: currentMobileNumber
                }
            ]
        }
    ];

    console.log('Sending reschedule request:', payload);

    try {
        const [response] = await Promise.all([
            fetch('https://15vz409ax0.execute-api.ap-south-1.amazonaws.com/dev/pos/reschadule_shipment', {
                method: 'POST',
                headers: {
                    'x-api-key': 'rmK6iPQK2G0xc1UTHUHhiDpZ7RYADu3yOD5hUAf0',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            }),
            new Promise(resolve => setTimeout(resolve, 5000))
        ]);

        const data = await response.json();
        console.log('API Response:', data);

        hideLoader();

        document.getElementById('modal-overlay').style.display = 'none';

        if (!response.ok) {
            throw new Error(data.message || `API error: ${response.status}`);
        }

        addRescheduleRequest(currentOrderId, currentVariantId, 'success', selectedDate);

        confirmationModal.style.display = 'flex';
        confirmationModalElement.classList.remove('confirmation-modal-error');
        confirmationModalElement.classList.add('confirmation-modal-success');
        confirmationTitle.textContent = 'Delivery Date Rescheduled';
        confirmationIcon.textContent = '✔';
        confirmationIcon.className = 'confirmation-icon success';
        confirmationDetails.innerHTML = `
                    <p><strong>Order ID:</strong> ${currentOrderId || 'N/A'}</p>
                    <p><strong>Product Name:</strong> ${currentProductName || 'N/A'}</p>
                    <p><strong>Original Delivery Date:</strong> ${currentDeliveryDate || 'N/A'}</p>
                    <p><strong>New Delivery Date:</strong> ${selectedDate}</p>
                    <p><strong>Status:</strong> Order rescheduled successfully</p>
                `;
        console.log(`Rescheduling successful for Order ID ${currentOrderId}, Product: ${currentProductName} to new EDD: ${selectedDate}`);

    } catch (error) {
        console.error('Error rescheduling:', error);

        hideLoader();

        document.getElementById('modal-overlay').style.display = 'none';

        confirmationModal.style.display = 'flex';
        confirmationModalElement.classList.remove('confirmation-modal-success');
        confirmationModalElement.classList.add('confirmation-modal-error');
        confirmationTitle.textContent = 'Rescheduling Failed';
        confirmationIcon.textContent = '✘';
        confirmationIcon.className = 'confirmation-icon error';
        confirmationDetails.innerHTML = `
                    <p><strong>Error:</strong> ${error.message || 'Failed to reschedule order'}</p>
                `;
    }
}

async function handlePhoneSearch() {
    const phoneNumber = document.getElementById('phone-number').value.trim();
    const phoneSearchBtn = document.getElementById('phone-search-btn');
    const errorMessage = document.getElementById('error-message');
    const successMessage = document.getElementById('success-message');
    const resultsContainer = document.getElementById('results-container');

    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
    errorMessage.textContent = '';
    successMessage.textContent = '';
    resultsContainer.innerHTML = '';

    if (!/^\d{10}$/.test(phoneNumber)) {
        errorMessage.textContent = 'Please enter a valid 10-digit phone number';
        errorMessage.style.display = 'block';
        return;
    }

    phoneSearchBtn.disabled = true;
    phoneSearchBtn.innerHTML = '<span class="loader"></span> Searching...';

    try {
        const response = await fetch(`https://15vz409ax0.execute-api.ap-south-1.amazonaws.com/dev/pos/items_by_delivery_date?phonenumber=${phoneNumber}`, {
            method: 'GET',
            headers: {
                'x-api-key': 'rmK6iPQK2G0xc1UTHUHhiDpZ7RYADu3yOD5hUAf0'
            }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API Response:', data);

        const results = data.data || [];

        if (results.length === 0) {
            errorMessage.textContent = 'No results found for this phone number';
            errorMessage.style.display = 'block';
            phoneSearchBtn.disabled = false;
            phoneSearchBtn.innerHTML = 'Search';
            return;
        }

        successMessage.textContent = `Found ${results.length} order(s)!`;
        successMessage.style.display = 'block';

        let tableHTML = `
                    <table class="results-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th>Variant ID</th>
                                <th>Delivery Date</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

        results.forEach(order => {
            for (const [deliveryDate, items] of Object.entries(order.itemlist || {})) {
                items.forEach(item => {
                    tableHTML += `
                                <tr>
                                    <td>${order.order_id || 'N/A'}</td>
                                    <td>${item.productname || 'N/A'}</td>
                                    <td>${item.sku || 'N/A'}</td>
                                    <td>${item.variant_id || 'N/A'}</td>
                                    <td>${deliveryDate || 'N/A'}</td>
                                    <td><button class="reschedule-btn" onclick="openModal('${order.order_id}', '${deliveryDate}', '${item.productname || 'N/A'}', '${item.variant_id || 'N/A'}', '${phoneNumber}')">Reschedule EDD</button></td>
                                </tr>
                            `;
                });
            }
        });

        tableHTML += '</tbody></table>';
        resultsContainer.innerHTML = tableHTML;

    } catch (error) {
        console.error('Error:', error);
        errorMessage.textContent = `Error fetching data: ${error.message}`;
        errorMessage.style.display = 'block';
    }

    phoneSearchBtn.disabled = false;
    phoneSearchBtn.innerHTML = 'Search';
}

function handleOrderSearch() {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = 'Order ID search is not implemented yet (API not provided)';
    errorMessage.style.display = 'block';
}

renderCalendar();