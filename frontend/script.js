// ========================================
// FastAPI 서버 주소
// ========================================
// 로컬 개발 환경(localhost, 127.0.0.1)에서는 로컬 서버를,
// 배포 환경(Vercel 등)에서는 Render 배포 주소를 자동으로 사용한다.
// ⚠️ 아래 "https://your-backend.onrender.com" 부분을 실제 Render 배포 주소로 반드시 교체할 것

const API_BASE_URL =
    (location.hostname === "localhost" || location.hostname === "127.0.0.1")
        ? "http://127.0.0.1:8000"
        : "https://your-backend.onrender.com";


// ========================================
// 현재 수정 중인 데이터 ID
// ========================================

let editingDataId = null;


// ========================================
// 그래프 관련 상태
// ========================================

let currentData = [];
let touristChart = null;


// ========================================
// 페이지가 열릴 때 실행
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    () => {
        loadSummary();
        loadConversations();
        loadData();

        document
            .getElementById("send-button")
            .addEventListener(
                "click",
                sendQuestion
            );

        document
            .getElementById("add-data-button")
            .addEventListener(
                "click",
                saveData
            );

        document
            .getElementById("refresh-data-button")
            .addEventListener(
                "click",
                loadData
            );

        document
            .getElementById("filter-button")
            .addEventListener(
                "click",
                loadData
            );

        document
            .getElementById("reset-filter-button")
            .addEventListener(
                "click",
                resetFilter
            );

        document
            .getElementById("graph-button")
            .addEventListener(
                "click",
                toggleChart
            );

        document
            .getElementById("close-chart-button")
            .addEventListener(
                "click",
                hideChart
            );

        document
            .getElementById("data-visitor-count")
            .addEventListener(
                "input",
                calculateFormChangeRate
            );

        document
            .getElementById("data-previous-count")
            .addEventListener(
                "input",
                calculateFormChangeRate
            );

        document
            .getElementById("data-date")
            .addEventListener(
                "input",
                checkPreviousData
            );

        document
            .getElementById("data-region")
            .addEventListener(
                "input",
                checkPreviousData
            );
    }
);


// ========================================
// 전년동월 데이터 자동조회
// ========================================

async function checkPreviousData() {
    if (editingDataId) {
        return;
    }

    const dateInput = document.getElementById("data-date");
    const regionInput = document.getElementById("data-region");
    const previousCountInput = document.getElementById("data-previous-count");

    const date = dateInput.value.trim();
    const region = regionInput.value.trim();

    if (
        !/^\d{6}$/.test(date) ||
        !region
    ) {
        previousCountInput.value = "";
        previousCountInput.readOnly = false;
        previousCountInput.placeholder = "전년동월 방문자 수";
        calculateFormChangeRate();
        return;
    }

    try {
        const params = new URLSearchParams({
            date: date,
            region: region
        });

        const response = await fetch(
            `${API_BASE_URL}/api/data/previous?${params.toString()}`
        );

        if (!response.ok) {
            throw new Error(
                "전년동월 데이터 조회에 실패했습니다."
            );
        }

        const result = await response.json();

        if (result.found) {
            previousCountInput.value = result.previous_count;
            previousCountInput.readOnly = true;
            previousCountInput.placeholder = "";
        } else {
            previousCountInput.value = "";
            previousCountInput.readOnly = false;
            previousCountInput.placeholder = "전년동월 방문자 수 (직접 입력)";
        }

        calculateFormChangeRate();

    } catch (error) {
        console.error(error);
        previousCountInput.readOnly = false;
    }
}


// ========================================
// 관광 데이터 요약
// ========================================

async function loadSummary() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/data/summary`
        );

        if (!response.ok) {
            throw new Error(
                "요약 데이터를 불러오지 못했습니다."
            );
        }

        const data = await response.json();

        document.getElementById(
            "summary-period"
        ).textContent = data.period ?? "-";

        document.getElementById(
            "summary-count"
        ).textContent = `${data.count.toLocaleString()}건`;

        document.getElementById(
            "summary-average"
        ).textContent = `${Math.round(
            data.metrics.average
        ).toLocaleString()}명`;

        document.getElementById(
            "summary-trend"
        ).textContent = data.trend ?? "-";

    } catch (error) {
        console.error(error);
        document.getElementById("summary-period").textContent = "불러오기 실패";
        document.getElementById("summary-count").textContent = "-";
        document.getElementById("summary-average").textContent = "-";
        document.getElementById("summary-trend").textContent = "-";
    }
}


// ========================================
// 관광 데이터 목록 가져오기
// ========================================

async function loadData() {
    const tableBody = document.getElementById("data-table-body");
    const region = document.getElementById("filter-region").value;
    const startDate = document.getElementById("filter-start-date").value.trim();
    const endDate = document.getElementById("filter-end-date").value.trim();

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-message">
                데이터를 불러오는 중입니다...
            </td>
        </tr>
    `;

    try {
        const params = new URLSearchParams();

        if (region) params.append("region", region);
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);

        const queryString = params.toString();
        const url = queryString
            ? `${API_BASE_URL}/api/data?${queryString}`
            : `${API_BASE_URL}/api/data`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                "관광 데이터를 불러오지 못했습니다."
            );
        }

        const result = await response.json();
        currentData = result.data || [];
        tableBody.innerHTML = "";

        if (
            !result.data ||
            result.data.length === 0
        ) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        조건에 맞는 데이터가 없습니다.
                    </td>
                </tr>
            `;
            updateFilterResult(0);
            hideChart();
            return;
        }

        result.data.forEach(
            item => {
                const row = document.createElement("tr");
                row.dataset.id = item.id;

                row.innerHTML = `
                    <td>${escapeHtml(item.date)}</td>
                    <td>${escapeHtml(item.region)}</td>
                    <td>${Number(item.visitor_count).toLocaleString()}</td>
                    <td>${Number(item.previous_count).toLocaleString()}</td>
                    <td>${Number(item.change_rate).toFixed(1)}%</td>
                    <td>
                        <div class="action-buttons">
                            <button class="edit-button" type="button">
                                ✏️ 수정
                            </button>
                            <button class="delete-button" type="button">
                                🗑️ 삭제
                            </button>
                        </div>
                    </td>
                `;

                row.querySelector(".edit-button").addEventListener(
                    "click",
                    () => startEdit(item)
                );

                row.querySelector(".delete-button").addEventListener(
                    "click",
                    () => deleteData(item.id)
                );

                tableBody.appendChild(row);
            }
        );

        updateFilterResult(result.count);

        const chartSection = document.getElementById("chart-section");
        if (!chartSection.classList.contains("hidden")) {
            createTouristChart();
        }

    } catch (error) {
        console.error(error);
        currentData = [];
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    데이터를 불러오지 못했습니다.
                </td>
            </tr>
        `;
    }
}


// ========================================
// 조회 결과 표시
// ========================================

function updateFilterResult(count) {
    const result = document.getElementById("filter-result");
    result.textContent = `조회 결과: ${count.toLocaleString()}건`;
}


// ========================================
// 조회 조건 초기화
// ========================================

function resetFilter() {
    document.getElementById("filter-region").value = "";
    document.getElementById("filter-start-date").value = "";
    document.getElementById("filter-end-date").value = "";
    hideChart();
    loadData();
}


// ========================================
// 그래프 표시 / 숨김
// ========================================

function toggleChart() {
    const chartSection = document.getElementById("chart-section");

    if (chartSection.classList.contains("hidden")) {
        if (!currentData || currentData.length === 0) {
            alert("먼저 조회할 데이터를 선택해주세요.");
            return;
        }

        createTouristChart();
        chartSection.classList.remove("hidden");
        chartSection.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    } else {
        hideChart();
    }
}


// ========================================
// 그래프 숨기기
// ========================================

function hideChart() {
    const chartSection = document.getElementById("chart-section");
    if (!chartSection) return;

    chartSection.classList.add("hidden");

    if (touristChart) {
        touristChart.destroy();
        touristChart = null;
    }
}


// ========================================
// 관광객 추이 그래프 생성
// ========================================

function createTouristChart() {
    const canvas = document.getElementById("tourist-chart");
    if (!canvas || !currentData || currentData.length === 0) return;

    if (touristChart) {
        touristChart.destroy();
        touristChart = null;
    }

    const sortedData = [...currentData].sort(
        (a, b) => String(a.date).localeCompare(String(b.date))
    );

    const labels = sortedData.map(
        item => {
            const date = String(item.date);
            if (date.length === 6) {
                return `${date.substring(0, 4)}-${date.substring(4, 6)}`;
            }
            return date;
        }
    );

    const visitorCounts = sortedData.map(
        item => Number(item.visitor_count)
    );

    const regions = [
        ...new Set(sortedData.map(item => item.region))
    ];

    let title = "월별 관광객 추이";
    if (regions.length === 1) {
        title = `${regions[0]} 월별 관광객 추이`;
    }

    touristChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "방문자 수",
                    data: visitorCounts,
                    borderWidth: 3,
                    tension: 0.3,
                    fill: false,
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: { display: true },
                title: {
                    display: true,
                    text: title,
                    font: { size: 18 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = Number(context.raw);
                            return ` 방문자 수: ${value.toLocaleString()}명`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: "기준년월" }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: "방문자 수" },
                    ticks: {
                        callback: function(value) {
                            return Number(value).toLocaleString();
                        }
                    }
                }
            }
        }
    });
}


// ========================================
// 입력폼 증감률 자동 계산
// ========================================

function calculateFormChangeRate() {
    const visitorCount = Number(
        document.getElementById("data-visitor-count").value
    );
    const previousCount = Number(
        document.getElementById("data-previous-count").value
    );
    const rateElement = document.getElementById("calculated-change-rate");

    if (!visitorCount && visitorCount !== 0) {
        rateElement.textContent = "-";
        return;
    }

    if (!previousCount || previousCount <= 0) {
        rateElement.textContent = "-";
        return;
    }

    const rate = ((visitorCount - previousCount) / previousCount) * 100;
    rateElement.textContent = `${rate.toFixed(1)}%`;
}


// ========================================
// 데이터 추가 / 수정 저장
// ========================================

async function saveData() {
    const button = document.getElementById("add-data-button");
    const result = document.getElementById("data-result");

    const date = document.getElementById("data-date").value.trim();
    const region = document.getElementById("data-region").value.trim();
    const visitorCount = document.getElementById("data-visitor-count").value;
    const previousCount = document.getElementById("data-previous-count").value;

    if (
        !date ||
        !region ||
        visitorCount === "" ||
        previousCount === ""
    ) {
        result.className = "data-result error";
        result.textContent = "기준년월, 지역, 방문자 수, 전년동월 방문자 수를 모두 입력해주세요.";
        return;
    }

    if (!/^\d{6}$/.test(date)) {
        result.className = "data-result error";
        result.textContent = "기준년월은 6자리 숫자로 입력해주세요. 예: 202608";
        return;
    }

    button.disabled = true;
    result.className = "data-result";
    result.textContent = editingDataId
        ? "데이터를 수정하고 있습니다..."
        : "데이터를 저장하고 있습니다...";

    try {
        const requestBody = {
            date: date,
            region: region,
            visitor_count: Number(visitorCount),
            previous_count: Number(previousCount)
        };

        let response;

        if (editingDataId) {
            response = await fetch(
                `${API_BASE_URL}/api/data/${editingDataId}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                }
            );
        } else {
            response = await fetch(
                `${API_BASE_URL}/api/data`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody)
                }
            );
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "데이터 처리에 실패했습니다.");
        }

        result.className = "data-result success";
        result.textContent = editingDataId
            ? "데이터가 성공적으로 수정되었습니다."
            : "데이터가 성공적으로 저장되었습니다.";

        resetDataForm();
        await loadSummary();
        await loadData();

    } catch (error) {
        console.error(error);
        result.className = "data-result error";
        result.textContent = `오류가 발생했습니다: ${error.message}`;
    } finally {
        button.disabled = false;
    }
}


// ========================================
// 데이터 수정 시작
// ========================================

function startEdit(item) {
    editingDataId = item.id;

    document.getElementById("data-date").value = item.date;
    document.getElementById("data-region").value = item.region;
    document.getElementById("data-visitor-count").value = item.visitor_count;

    const previousCountInput = document.getElementById("data-previous-count");
    previousCountInput.value = item.previous_count;
    previousCountInput.readOnly = false;

    calculateFormChangeRate();

    const button = document.getElementById("add-data-button");
    button.textContent = "💾 수정 저장";

    createCancelButton();

    const result = document.getElementById("data-result");
    result.className = "data-result";
    result.textContent = "수정할 내용을 입력한 후 '수정 저장'을 눌러주세요.";

    document.getElementById("data-date").scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
    document.getElementById("data-date").focus();
}


// ========================================
// 수정 취소 버튼 생성
// ========================================

function createCancelButton() {
    const form = document.querySelector(".data-form");
    if (document.getElementById("cancel-edit-button")) {
        return;
    }

    const cancelButton = document.createElement("button");
    cancelButton.id = "cancel-edit-button";
    cancelButton.type = "button";
    cancelButton.textContent = "↩️ 수정 취소";
    cancelButton.addEventListener("click", resetDataForm);

    form.appendChild(cancelButton);
}


// ========================================
// 데이터 삭제
// ========================================

async function deleteData(dataId) {
    const confirmed = confirm("정말 이 데이터를 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/data/${dataId}`,
            { method: "DELETE" }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "데이터 삭제에 실패했습니다.");
        }

        alert("데이터가 성공적으로 삭제되었습니다.");
        await loadSummary();
        await loadData();

    } catch (error) {
        console.error(error);
        alert(`삭제 중 오류가 발생했습니다.\n${error.message}`);
    }
}


// ========================================
// 데이터 입력폼 초기화
// ========================================

function resetDataForm() {
    editingDataId = null;

    document.getElementById("data-date").value = "";
    document.getElementById("data-region").value = "";
    document.getElementById("data-visitor-count").value = "";

    const previousCountInput = document.getElementById("data-previous-count");
    previousCountInput.value = "";
    previousCountInput.readOnly = false;
    previousCountInput.placeholder = "전년동월 방문자 수";

    document.getElementById("calculated-change-rate").textContent = "-";

    const button = document.getElementById("add-data-button");
    button.textContent = "데이터 추가";

    const cancelButton = document.getElementById("cancel-edit-button");
    if (cancelButton) {
        cancelButton.remove();
    }
}


// ========================================
// 질문 보내기
// ========================================

async function sendQuestion() {
    const input = document.getElementById("question-input");
    const button = document.getElementById("send-button");
    const loading = document.getElementById("loading");

    const question = input.value.trim();
    if (!question) {
        alert("질문을 입력해주세요.");
        return;
    }

    addMessage("user", question);
    input.value = "";

    loading.classList.remove("hidden");
    button.disabled = true;

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/chat`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: question })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "AI 응답을 가져오지 못했습니다.");
        }

        addMessage("ai", data.answer);
        loadConversations();

    } catch (error) {
        console.error(error);
        addMessage("ai", `오류가 발생했습니다.\n${error.message}`);
    } finally {
        loading.classList.add("hidden");
        button.disabled = false;
        input.focus();
    }
}


// ========================================
// 채팅 메시지 추가
// ========================================

function addMessage(type, message) {
    const chatMessages = document.getElementById("chat-messages");
    const messageElement = document.createElement("div");

    if (type === "user") {
        messageElement.className = "message user-message";
        messageElement.innerHTML = `
            <div class="message-label">나</div>
            <div class="message-content">${escapeHtml(message)}</div>
        `;
    } else {
        messageElement.className = "message ai-message";
        messageElement.innerHTML = `
            <div class="message-label">Local Guide AI</div>
            <div class="message-content">${escapeHtml(message)}</div>
        `;
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


// ========================================
// 대화 기록 가져오기
// ========================================

async function loadConversations() {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/conversations`
        );

        if (!response.ok) {
            throw new Error("대화 기록을 불러오지 못했습니다.");
        }

        const data = await response.json();
        const conversationList = document.getElementById("conversation-list");
        conversationList.innerHTML = "";

        if (!data.conversations || data.conversations.length === 0) {
            conversationList.innerHTML = `
                <p class="empty-message">
                    저장된 대화가 없습니다.
                </p>
            `;
            return;
        }

        data.conversations.forEach(
            conversation => {
                const item = document.createElement("div");
                item.className = "conversation-item";
                item.style.cursor = "pointer";
                item.title = "클릭하면 이 대화를 다시 볼 수 있어요.";

                item.innerHTML = `
                    <div class="conversation-question">
                        <strong>Q.</strong> ${escapeHtml(conversation.question)}
                    </div>
                    <div class="conversation-answer">
                        <strong>A.</strong> ${escapeHtml(conversation.answer)}
                    </div>
                `;

                item.addEventListener(
                    "click",
                    () => loadConversationDetail(conversation.id)
                );

                conversationList.appendChild(item);
            }
        );

    } catch (error) {
        console.error(error);
        const conversationList = document.getElementById("conversation-list");
        conversationList.innerHTML = `
            <p class="empty-message">
                대화 기록을 불러오지 못했습니다.
            </p>
        `;
    }
}


// ========================================
// 특정 대화 불러오기 (클릭 시 채팅창에 재표시)
// ========================================

async function loadConversationDetail(conversationId) {
    const chatMessages = document.getElementById("chat-messages");

    try {
        const response = await fetch(
            `${API_BASE_URL}/api/conversations/${conversationId}`
        );

        if (!response.ok) {
            throw new Error("해당 대화를 불러오지 못했습니다.");
        }

        const conversation = await response.json();

        // 기존 채팅 내용을 지우고 불러온 대화로 교체
        chatMessages.innerHTML = "";

        if (
            Array.isArray(conversation.messages) &&
            conversation.messages.length > 0
        ) {
            // messages 필드가 있는 경우 (chat.py를 통해 저장된 대화)
            conversation.messages.forEach(
                message => {
                    const type = message.role === "user" ? "user" : "ai";
                    addMessage(type, message.content);
                }
            );
        } else {
            // messages 필드가 없는 구버전 대화 (question/answer만 있는 경우)
            addMessage("user", conversation.question);
            addMessage("ai", conversation.answer);
        }

        chatMessages.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });

    } catch (error) {
        console.error(error);
        alert(`대화를 불러오지 못했습니다.\n${error.message}`);
    }
}


// ========================================
// HTML 특수문자 이스케이프 함수
// ========================================

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/'/g, "&#039;")
        .replace(/"/g, "&quot;");
}