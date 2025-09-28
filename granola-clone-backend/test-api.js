// Test script to verify SarvamAI API key works with REST API
require("dotenv").config();
const https = require("https");

const API_KEY = process.env.SARVAM_API_KEY;

function testAPIKey() {
  console.log(
    "🔑 Testing API Key:",
    API_KEY ? `${API_KEY.substring(0, 10)}...` : "NOT SET"
  );

  const postData = JSON.stringify({
    model: "saarika:v2.5",
    language_code: "hi-IN",
  });

  const options = {
    hostname: "api.sarvam.ai",
    port: 443,
    path: "/speech-to-text",
    method: "POST",
    headers: {
      "api-subscription-key": API_KEY,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  const req = https.request(options, (res) => {
    console.log("📡 Response Status:", res.statusCode);
    console.log("📡 Response Headers:", res.headers);

    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });

    res.on("end", () => {
      console.log("📡 Response Body:", data);

      if (res.statusCode === 403) {
        console.error(
          "❌ 403 Forbidden - API key is invalid or account has issues"
        );
      } else if (res.statusCode === 400) {
        console.log("✅ API key is valid (400 is expected without audio file)");
      } else {
        console.log("✅ API key seems to work, status:", res.statusCode);
      }
    });
  });

  req.on("error", (error) => {
    console.error("❌ Error testing API:", error.message);
  });

  req.write(postData);
  req.end();
}

testAPIKey();
