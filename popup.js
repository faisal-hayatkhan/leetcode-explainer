document.getElementById("summarize").addEventListener("click", async () => {
  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = '<div class="loading"><div class="loader"></div></div>';

  const explanationType = document.getElementById("summary-type").value;

  chrome.storage.sync.get(["geminiApiKey"], async (result) => {
    if (!result.geminiApiKey) {
      resultDiv.innerHTML =
        "API key not found. Please set your API key in the extension options.";
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(
        tab.id,
        { type: "GET_ARTICLE_TEXT" },
        async (res) => {
          if (!res || !res.text) {
            resultDiv.innerText = res.error || "Could not extract problem text from this page.";
            return;
          }

          try {
            const explanation = await getGeminiExplanation(
              res.text,
              explanationType,
              result.geminiApiKey
            );

            // **UPDATED PART**: Process response to wrap headings in a styled span
            const formattedExplanation = explanation.replace(
              /\*\*(.*?)\*\*/g,
              '<span class="result-heading">$1</span>'
            );
            resultDiv.innerHTML = formattedExplanation; // Use innerHTML to render the new span

          } catch (error) {
            resultDiv.innerText = `Error: ${
              error.message || "Failed to generate explanation."
            }`;
          }
        }
      );
    });
  });
});

document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});

async function getGeminiExplanation(problemText, explanationType, apiKey) {
  const maxLength = 20000;
  const truncatedText =
    problemText.length > maxLength ? problemText.substring(0, maxLength) + "..." : problemText;

  let prompt;
  switch (explanationType) {
    case "simple":
      prompt = `You are an expert LeetCode tutor. Explain the core logic and goal of the following problem in simple, easy-to-understand terms. Focus on what the problem is asking for, the inputs, and the expected output.\n\nProblem:\n${truncatedText}`;
      break;
    case "breakdown":
      prompt = `You are a meticulous software engineer. Break down the following LeetCode problem into its key components. Use clear headings for each section (e.g., **Inputs**, **Output**, **Constraints**, **Goal**, **Edge Cases**).\n\nProblem:\n${truncatedText}`;
      break;
    case "analogy":
      prompt = `You are a creative teacher. Explain the following LeetCode problem using a simple, real-world analogy that a beginner could understand. Start with the analogy and then connect it back to the problem's technical requirements.\n\nProblem:\n${truncatedText}`;
      break;
    default:
      prompt = `Explain the following LeetCode problem:\n\n${truncatedText}`;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2 },
        }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error?.message || "API request failed");
    }

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No explanation available."
    );
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate explanation. Please check your API key and network connection.");
  }
}