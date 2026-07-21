fetch("http://localhost:5000/api/auth/save-lead", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    org: {
      name: "abc",
      email: "singareakshay111@gmail.com",
      city: "Pune",
      state: "Maharashtra",
      country: "India",
      address: "123 Test Street",
      phone: "7020540649"
    },
    admin: {}
  })
}).then(res => res.json()).then(console.log).catch(console.error);
