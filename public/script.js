document
    .getElementById("proxyForm")
    .addEventListener("submit", async function (event) {
        event.preventDefault();

        const targetUrl = document.getElementById("targetUrl").value;
        const responseOutput = document.getElementById("responseOutput");

        try {
            const response = await fetch(
                `/proxy/?url=${encodeURIComponent(targetUrl)}`,
            );
            const data = await response.text();
            responseOutput.textContent = data;
        } catch (error) {
            responseOutput.textContent = "An error occurred: " + error.message;
        }
    });
