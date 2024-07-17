document
    .getElementById("proxyForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();

        const targetUrl = document.getElementById("targetUrl").value;
        const method = document.getElementById("method").value;
        const headersInput = document.getElementById("headers").value;
        const body = document.getElementById("body").value;
        const responseOutput = document.getElementById("responseOutput");

        let headers = {};
        try {
            headers = headersInput ? JSON.parse(headersInput) : {};
        } catch (e) {
            responseOutput.textContent = "Invalid headers JSON format";
            return;
        }

        try {
            const response = await fetch(
                `/proxy/?url=${encodeURIComponent(targetUrl)}`,
                {
                    method: method,
                    headers: {
                        "Content-Type": "application/json",
                        ...headers,
                    },
                    body: method !== "GET" ? body : null,
                },
            );

            const responseData = await response.text();
            responseOutput.textContent = responseData;
        } catch (error) {
            responseOutput.textContent = "An error occurred: " + error.message;
        }
    });
