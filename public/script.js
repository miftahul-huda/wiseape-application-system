const appRoot = document.getElementById('app');
const system = new WiseApplicationSystem({ root: appRoot });

system.run().catch((err) => {
  appRoot.innerHTML = `<div style="padding: 24px; color: #b91c1c; font-family: sans-serif;">${err.message}</div>`;
});
