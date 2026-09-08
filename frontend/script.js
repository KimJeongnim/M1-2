// ========================================
// FastAPI 서버 주소
// ========================================

const API_BASE_URL = "http://127.0.0.1:8000";


// ========================================
// 현재 수정 중인 데이터 ID
// ========================================

let editingDataId = null;


// ========================================
// 그래프 관련 상태
// ========================================

// 현재 조회된 데이터
let currentData = [];

// 현재 생성된 Chart.js 객체
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


        // 그래프 보기 버튼
        document
            .getElementById("graph-button")
            .addEventListener(
                "click",
                toggleChart
            );


        // 그래프 닫기 버튼
        document
            .getElementById("close-chart-button")
            .addEventListener(
                "click",
                hideChart
            );


        // 방문자 수 변경 시 증감률 자동 계산
        document
            .getElementById("data-visitor-count")
            .addEventListener(
                "input",
                calculateFormChangeRate
            );


        // 전년동월 방문자 수 변경 시 증감률 자동 계산
        document
            .getElementById("data-previous-count")
            .addEventListener(
                "input",
                calculateFormChangeRate
            );

    }
);


// ========================================
// 관광 데이터 요약
// ========================================

async function loadSummary() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/data/summary`
            );


        if (!response.ok) {

            throw new Error(
                "요약 데이터를 불러오지 못했습니다."
            );

        }


        const data =
            await response.json();


        document.getElementById(
            "summary-period"
        ).textContent =
            data.period ?? "-";


        document.getElementById(
            "summary-count"
        ).textContent =
            `${data.count.toLocaleString()}건`;


        document.getElementById(
            "summary-average"
        ).textContent =
            `${Math.round(
                data.metrics.average
            ).toLocaleString()}명`;


        document.getElementById(
            "summary-trend"
        ).textContent =
            data.trend ?? "-";


    } catch (error) {

        console.error(error);


        document.getElementById(
            "summary-period"
        ).textContent =
            "불러오기 실패";


        document.getElementById(
            "summary-count"
        ).textContent =
            "-";


        document.getElementById(
            "summary-average"
        ).textContent =
            "-";


        document.getElementById(
            "summary-trend"
        ).textContent =
            "-";

    }

}


// ========================================
// 관광 데이터 목록 가져오기
// ========================================

async function loadData() {

    const tableBody =
        document.getElementById(
            "data-table-body"
        );


    const region =
        document.getElementById(
            "filter-region"
        ).value;


    const startDate =
        document.getElementById(
            "filter-start-date"
        ).value.trim();


    const endDate =
        document.getElementById(
            "filter-end-date"
        ).value.trim();


    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-message">
                데이터를 불러오는 중입니다...
            </td>
        </tr>
    `;


    try {

        const params =
            new URLSearchParams();


        if (region) {

            params.append(
                "region",
                region
            );

        }


        if (startDate) {

            params.append(
                "start_date",
                startDate
            );

        }


        if (endDate) {

            params.append(
                "end_date",
                endDate
            );

        }


        const queryString =
            params.toString();


        const url =
            queryString
                ? `${API_BASE_URL}/api/data?${queryString}`
                : `${API_BASE_URL}/api/data`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "관광 데이터를 불러오지 못했습니다."
            );

        }


        const result =
            await response.json();


        // 현재 조회된 데이터를 저장
        currentData =
            result.data || [];


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

                const row =
                    document.createElement(
                        "tr"
                    );


                row.dataset.id =
                    item.id;


                row.innerHTML = `
                    <td>
                        ${escapeHtml(
                            item.date
                        )}
                    </td>

                    <td>
                        ${escapeHtml(
                            item.region
                        )}
                    </td>

                    <td>
                        ${Number(
                            item.visitor_count
                        ).toLocaleString()}
                    </td>

                    <td>
                        ${Number(
                            item.previous_count
                        ).toLocaleString()}
                    </td>

                    <td>
                        ${Number(
                            item.change_rate
                        ).toFixed(1)}%
                    </td>

                    <td>

                        <div class="action-buttons">

                            <button
                                class="edit-button"
                                type="button"
                            >
                                ✏️ 수정
                            </button>

                            <button
                                class="delete-button"
                                type="button"
                            >
                                🗑️ 삭제
                            </button>

                        </div>

                    </td>
                `;


                row
                    .querySelector(
                        ".edit-button"
                    )
                    .addEventListener(
                        "click",
                        () => startEdit(item)
                    );


                row
                    .querySelector(
                        ".delete-button"
                    )
                    .addEventListener(
                        "click",
                        () => deleteData(
                            item.id
                        )
                    );


                tableBody.appendChild(
                    row
                );

            }
        );


        updateFilterResult(
            result.count
        );


        // 기존에 그래프가 열려 있었다면
        // 새로운 조회 결과로 그래프 갱신
        const chartSection =
            document.getElementById(
                "chart-section"
            );


        if (
            !chartSection.classList.contains(
                "hidden"
            )
        ) {

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

    const result =
        document.getElementById(
            "filter-result"
        );


    result.textContent =
        `조회 결과: ${count.toLocaleString()}건`;

}


// ========================================
// 조회 조건 초기화
// ========================================

function resetFilter() {

    document.getElementById(
        "filter-region"
    ).value = "";


    document.getElementById(
        "filter-start-date"
    ).value = "";


    document.getElementById(
        "filter-end-date"
    ).value = "";


    hideChart();


    loadData();

}


// ========================================
// 그래프 표시 / 숨김
// ========================================

function toggleChart() {

    const chartSection =
        document.getElementById(
            "chart-section"
        );


    if (
        chartSection.classList.contains(
            "hidden"
        )
    ) {

        if (
            !currentData ||
            currentData.length === 0
        ) {

            alert(
                "먼저 조회할 데이터를 선택해주세요."
            );

            return;

        }


        createTouristChart();


        chartSection.classList.remove(
            "hidden"
        );


        // 그래프가 나타난 뒤 화면을 살짝 이동
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

    const chartSection =
        document.getElementById(
            "chart-section"
        );


    if (!chartSection) {

        return;

    }


    chartSection.classList.add(
        "hidden"
    );


    if (touristChart) {

        touristChart.destroy();

        touristChart =
            null;

    }

}


// ========================================
// 관광객 추이 그래프 생성
// ========================================

function createTouristChart() {

    const canvas =
        document.getElementById(
            "tourist-chart"
        );


    if (!canvas) {

        return;

    }


    if (
        !currentData ||
        currentData.length === 0
    ) {

        return;

    }


    // 기존 그래프 제거
    if (touristChart) {

        touristChart.destroy();

        touristChart =
            null;

    }


    // 날짜순으로 정렬
    const sortedData =
        [...currentData].sort(
            (a, b) =>
                String(a.date)
                    .localeCompare(
                        String(b.date)
                    )
        );


    // X축
    const labels =
        sortedData.map(
            item => {

                const date =
                    String(item.date);


                if (
                    date.length === 6
                ) {

                    return `${date.substring(
                        0,
                        4
                    )}-${date.substring(
                        4,
                        6
                    )}`;

                }


                return date;

            }
        );


    // Y축
    const visitorCounts =
        sortedData.map(
            item =>
                Number(
                    item.visitor_count
                )
        );


    // 지역 확인
    const regions =
        [
            ...new Set(
                sortedData.map(
                    item =>
                        item.region
                )
            )
        ];


    let title =
        "월별 관광객 추이";


    if (
        regions.length === 1
    ) {

        title =
            `${regions[0]} 월별 관광객 추이`;

    }


    touristChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels:
                        labels,

                    datasets: [

                        {
                            label:
                                "방문자 수",

                            data:
                                visitorCounts,

                            borderWidth:
                                3,

                            tension:
                                0.3,

                            fill:
                                false,

                            pointRadius:
                                5,

                            pointHoverRadius:
                                7

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


                    plugins: {

                        legend: {

                            display:
                                true

                        },


                        title: {

                            display:
                                true,

                            text:
                                title,

                            font: {

                                size:
                                    18

                            }

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        const value =
                                            Number(
                                                context.raw
                                            );


                                        return ` 방문자 수: ${value.toLocaleString()}명`;

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            title: {

                                display:
                                    true,

                                text:
                                    "기준년월"

                            }

                        },


                        y: {

                            beginAtZero:
                                true,

                            title: {

                                display:
                                    true,

                                text:
                                    "방문자 수"

                            },


                            ticks: {

                                callback:
                                    function(
                                        value
                                    ) {

                                        return Number(
                                            value
                                        ).toLocaleString();

                                    }

                            }

                        }

                    }

                }

            }
        );

}


// ========================================
// 입력폼 증감률 자동 계산
// ========================================

function calculateFormChangeRate() {

    const visitorCount =
        Number(
            document.getElementById(
                "data-visitor-count"
            ).value
        );


    const previousCount =
        Number(
            document.getElementById(
                "data-previous-count"
            ).value
        );


    const rateElement =
        document.getElementById(
            "calculated-change-rate"
        );


    if (
        !visitorCount &&
        visitorCount !== 0
    ) {

        rateElement.textContent =
            "-";

        return;

    }


    if (
        !previousCount ||
        previousCount <= 0
    ) {

        rateElement.textContent =
            "-";

        return;

    }


    const rate =
        (
            (visitorCount - previousCount)
            / previousCount
        ) * 100;


    rateElement.textContent =
        `${rate.toFixed(1)}%`;

}


// ========================================
// 데이터 추가 / 수정 저장
// ========================================

async function saveData() {

    const button =
        document.getElementById(
            "add-data-button"
        );


    const result =
        document.getElementById(
            "data-result"
        );


    const date =
        document.getElementById(
            "data-date"
        ).value.trim();


    const region =
        document.getElementById(
            "data-region"
        ).value.trim();


    const visitorCount =
        document.getElementById(
            "data-visitor-count"
        ).value;


    const previousCount =
        document.getElementById(
            "data-previous-count"
        ).value;


    // ========================================
    // 입력값 확인
    // ========================================

    if (
        !date ||
        !region ||
        visitorCount === "" ||
        previousCount === ""
    ) {

        result.className =
            "data-result error";


        result.textContent =
            "기준년월, 지역, 방문자 수, 전년동월 방문자 수를 모두 입력해주세요.";


        return;

    }


    if (
        !/^\d{6}$/.test(date)
    ) {

        result.className =
            "data-result error";


        result.textContent =
            "기준년월은 6자리 숫자로 입력해주세요. 예: 202608";


        return;

    }


    button.disabled =
        true;


    result.className =
        "data-result";


    result.textContent =
        editingDataId
            ? "데이터를 수정하고 있습니다..."
            : "데이터를 저장하고 있습니다...";


    try {

        const requestBody = {

            date: date,

            region: region,

            visitor_count:
                Number(
                    visitorCount
                ),

            previous_count:
                Number(
                    previousCount
                )

        };


        let response;


        // 수정
        if (editingDataId) {

            response =
                await fetch(
                    `${API_BASE_URL}/api/data/${editingDataId}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                requestBody
                            )
                    }
                );

        }


        // 신규 추가
        else {

            response =
                await fetch(
                    `${API_BASE_URL}/api/data`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify(
                                requestBody
                            )
                    }
                );

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "데이터 처리에 실패했습니다."
            );

        }


        result.className =
            "data-result success";


        result.textContent =
            editingDataId
                ? "데이터가 성공적으로 수정되었습니다."
                : "데이터가 성공적으로 저장되었습니다.";


        resetDataForm();


        await loadSummary();

        await loadData();


    } catch (error) {

        console.error(error);


        result.className =
            "data-result error";


        result.textContent =
            `오류가 발생했습니다: ${error.message}`;


    } finally {

        button.disabled =
            false;

    }

}


// ========================================
// 데이터 수정 시작
// ========================================

function startEdit(item) {

    editingDataId =
        item.id;


    document.getElementById(
        "data-date"
    ).value =
        item.date;


    document.getElementById(
        "data-region"
    ).value =
        item.region;


    document.getElementById(
        "data-visitor-count"
    ).value =
        item.visitor_count;


    document.getElementById(
        "data-previous-count"
    ).value =
        item.previous_count;


    calculateFormChangeRate();


    const button =
        document.getElementById(
            "add-data-button"
        );


    button.textContent =
        "💾 수정 저장";


    createCancelButton();


    const result =
        document.getElementById(
            "data-result"
        );


    result.className =
        "data-result";


    result.textContent =
        "수정할 내용을 입력한 후 '수정 저장'을 눌러주세요.";


    document.getElementById(
        "data-date"
    ).scrollIntoView({
        behavior: "smooth",
        block: "center"
    });


    document.getElementById(
        "data-date"
    ).focus();

}


// ========================================
// 수정 취소 버튼 생성
// ========================================

function createCancelButton() {

    const form =
        document.querySelector(
            ".data-form"
        );


    if (
        document.getElementById(
            "cancel-edit-button"
        )
    ) {

        return;

    }


    const cancelButton =
        document.createElement(
            "button"
        );


    cancelButton.id =
        "cancel-edit-button";


    cancelButton.type =
        "button";


    cancelButton.textContent =
        "↩️ 수정 취소";


    cancelButton.addEventListener(
        "click",
        resetDataForm
    );


    form.appendChild(
        cancelButton
    );

}


// ========================================
// 데이터 삭제
// ========================================

async function deleteData(
    dataId
) {

    const confirmed =
        confirm(
            "정말 이 데이터를 삭제하시겠습니까?"
        );


    if (!confirmed) {

        return;

    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/data/${dataId}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "데이터 삭제에 실패했습니다."
            );

        }


        alert(
            "데이터가 성공적으로 삭제되었습니다."
        );


        await loadSummary();

        await loadData();


    } catch (error) {

        console.error(error);


        alert(
            `삭제 중 오류가 발생했습니다.\n${error.message}`
        );

    }

}


// ========================================
// 데이터 입력폼 초기화
// ========================================

function resetDataForm() {

    editingDataId =
        null;


    document.getElementById(
        "data-date"
    ).value = "";


    document.getElementById(
        "data-region"
    ).value = "";


    document.getElementById(
        "data-visitor-count"
    ).value = "";


    document.getElementById(
        "data-previous-count"
    ).value = "";


    document.getElementById(
        "calculated-change-rate"
    ).textContent =
        "-";


    const button =
        document.getElementById(
            "add-data-button"
        );


    button.textContent =
        "데이터 추가";


    const cancelButton =
        document.getElementById(
            "cancel-edit-button"
        );


    if (cancelButton) {

        cancelButton.remove();

    }

}


// ========================================
// 질문 보내기
// ========================================

async function sendQuestion() {

    const input =
        document.getElementById(
            "question-input"
        );


    const button =
        document.getElementById(
            "send-button"
        );


    const loading =
        document.getElementById(
            "loading"
        );


    const question =
        input.value.trim();


    if (!question) {

        alert(
            "질문을 입력해주세요."
        );

        return;

    }


    addMessage(
        "user",
        question
    );


    input.value = "";


    loading.classList.remove(
        "hidden"
    );


    button.disabled =
        true;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/chat`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            question:
                                question
                        })
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "AI 응답을 가져오지 못했습니다."
            );

        }


        addMessage(
            "ai",
            data.answer
        );


        loadConversations();


    } catch (error) {

        console.error(error);


        addMessage(
            "ai",
            `오류가 발생했습니다.\n${error.message}`
        );


    } finally {

        loading.classList.add(
            "hidden"
        );


        button.disabled =
            false;


        input.focus();

    }

}


// ========================================
// 채팅 메시지 추가
// ========================================

function addMessage(
    type,
    message
) {

    const chatMessages =
        document.getElementById(
            "chat-messages"
        );


    const messageElement =
        document.createElement(
            "div"
        );


    if (type === "user") {

        messageElement.className =
            "message user-message";


        messageElement.innerHTML = `
            <div class="message-label">
                나
            </div>

            <div class="message-content">
                ${escapeHtml(message)}
            </div>
        `;

    } else {

        messageElement.className =
            "message ai-message";


        messageElement.innerHTML = `
            <div class="message-label">
                Local Guide AI
            </div>

            <div class="message-content">
                ${escapeHtml(message)}
            </div>
        `;

    }


    chatMessages.appendChild(
        messageElement
    );


    chatMessages.scrollTop =
        chatMessages.scrollHeight;

}


// ========================================
// 대화 기록 가져오기
// ========================================

async function loadConversations() {

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/api/conversations`
            );


        if (!response.ok) {

            throw new Error(
                "대화 기록을 불러오지 못했습니다."
            );

        }


        const data =
            await response.json();


        const conversationList =
            document.getElementById(
                "conversation-list"
            );


        conversationList.innerHTML =
            "";


        if (
            !data.conversations ||
            data.conversations.length === 0
        ) {

            conversationList.innerHTML = `
                <p class="empty-message">
                    저장된 대화가 없습니다.
                </p>
            `;


            return;

        }


        data.conversations.forEach(
            conversation => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.className =
                    "conversation-item";


                item.innerHTML = `
                    <div class="conversation-question">
                        ${escapeHtml(
                            conversation.question
                        )}
                    </div>

                    <div class="conversation-date">
                        ${escapeHtml(
                            conversation.created_at
                        )}
                    </div>
                `;


                item.addEventListener(
                    "click",
                    () =>
                        showConversation(
                            conversation
                        )
                );


                conversationList.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(error);


        document.getElementById(
            "conversation-list"
        ).innerHTML = `
            <p class="empty-message">
                대화 기록을 불러오지 못했습니다.
            </p>
        `;

    }

}


// ========================================
// 대화 기록 선택
// ========================================

function showConversation(
    conversation
) {

    const chatMessages =
        document.getElementById(
            "chat-messages"
        );


    chatMessages.innerHTML =
        "";


    addMessage(
        "user",
        conversation.question
    );


    addMessage(
        "ai",
        conversation.answer
    );

}


// ========================================
// HTML 특수문자 처리
// ========================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}