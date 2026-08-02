document.addEventListener("DOMContentLoaded", () => {
  const statusBtn = document.getElementById("statusBtn");
  const statusMessage = document.getElementById("statusMessage");

  statusBtn.addEventListener("click", () => {
    statusMessage.classList.remove("hidden");
    statusMessage.textContent =
      "Origem S3 privada configurada. Aguardando distribuição CloudFront com OAC.";
  });

  console.log("Frontend estático carregado a partir do bucket S3.");
});