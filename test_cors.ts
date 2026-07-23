import fetch from 'node-fetch';

async function main() {
  const res = await fetch("https://careerreflection-backend.onrender.com/admin/login", {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:5173",
      "Access-Control-Request-Method": "POST"
    }
  });

  console.log("CORS Status:", res.status);
  console.log("Access-Control-Allow-Origin:", res.headers.get("Access-Control-Allow-Origin"));
}

main().catch(console.error);
