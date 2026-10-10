// Endereço para onde apontam todos os links marcados com data-redirect.
const REDIRECT_URL = "https://www.cruzeirodosul.edu.br/";

const MAX_SIZE = 3 * 1024 * 1024; // 3 MB
const STORAGE_KEY = "documento-enviado";
const ACCEPTED_TYPES = /^(image\/.+|application\/pdf)$/;

const fileInput = document.getElementById("file-input");
const dropzone = document.getElementById("dropzone");
const uploadSection = document.getElementById("upload-section");
const previewSection = document.getElementById("preview-section");
const preview = document.getElementById("preview");
const errorBox = document.getElementById("error");

let currentObjectURL = null;

// ---------- Navegação ----------

document.querySelectorAll("[data-redirect]").forEach((link) => {
  link.href = REDIRECT_URL;
});

// ---------- Mensagens ----------

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}

// ---------- Armazenamento (localStorage) ----------

function saveDocument(doc) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));
    return true;
  } catch {
    return false;
  }
}

function loadDocument() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function deleteDocument() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sem acesso ao armazenamento: não há o que remover.
  }
}

// ---------- Conversões ----------

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// Converte o data URL salvo em um endereço blob:, que o navegador exibe
// tanto em <img> quanto em <iframe> (necessário para PDF).
function dataURLToObjectURL(dataURL) {
  const [header, base64] = dataURL.split(",");
  const type = header.match(/^data:(.*?);base64$/)[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return URL.createObjectURL(new Blob([bytes], { type }));
}

// ---------- Tela ----------

function render(doc) {
  if (currentObjectURL) {
    URL.revokeObjectURL(currentObjectURL);
    currentObjectURL = null;
  }
  preview.innerHTML = "";

  if (!doc) {
    uploadSection.hidden = false;
    previewSection.hidden = true;
    return;
  }

  currentObjectURL = dataURLToObjectURL(doc.data);

  let element;
  if (doc.type === "application/pdf") {
    element = document.createElement("iframe");
    element.title = doc.name;
  } else {
    element = document.createElement("img");
    element.alt = doc.name;
  }
  element.src = currentObjectURL;
  preview.appendChild(element);

  uploadSection.hidden = true;
  previewSection.hidden = false;
}

// ---------- Envio ----------

async function handleFile(file) {
  clearError();
  if (!file) return;

  if (!ACCEPTED_TYPES.test(file.type)) {
    showError("Formato não suportado. Envie uma imagem ou um PDF.");
    return;
  }
  if (file.size > MAX_SIZE) {
    showError("O arquivo passa de 3 MB. Escolha um arquivo menor.");
    return;
  }

  let data;
  try {
    data = await readAsDataURL(file);
  } catch {
    showError("Não foi possível ler o arquivo. Tente novamente.");
    return;
  }

  const doc = { name: file.name, type: file.type, data };
  if (!saveDocument(doc)) {
    showError("Não foi possível salvar no navegador. O documento fica visível só até fechar a página.");
  }
  render(doc);
}

fileInput.addEventListener("change", () => {
  handleFile(fileInput.files[0]);
  fileInput.value = ""; // permite escolher o mesmo arquivo de novo
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  handleFile(event.dataTransfer.files[0]);
});

// ---------- Início ----------

try {
  render(loadDocument());
} catch {
  // Dado salvo corrompido: descarta e volta para a tela de envio.
  deleteDocument();
  render(null);
}
