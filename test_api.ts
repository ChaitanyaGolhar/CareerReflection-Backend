import fetch from 'node-fetch';

async function main() {
  const loginRes = await fetch("https://careerreflection-backend.onrender.com/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@maketalentvisible.com", password: "AdminReflection2024!" })
  });

  const cookie = loginRes.headers.get("set-cookie");
  console.log("Login cookie:", cookie);

  const res = await fetch("https://careerreflection-backend.onrender.com/admin/reflections", {
    headers: {
      "Cookie": cookie
    }
  });

  const text = await res.text();
  console.log("Reflections response status:", res.status);
  console.log("Reflections response body:", text);
}

main().catch(console.error);
