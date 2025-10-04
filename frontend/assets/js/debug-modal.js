// Script de debugging temporal para verificar el estado del modal
console.log("=== DEBUGGING MODAL ===");

// Verificar elementos críticos
const checkElements = () => {
  console.log("1. Verificando elementos del DOM...");

  const table = document.querySelector("table.admin-table--expertos");
  console.log("Table found:", !!table);

  const viewButtons = document.querySelectorAll(".btn-view");
  console.log("View buttons found:", viewButtons.length);

  const modal = document.getElementById("verPerfilExperto");
  console.log("Modal found:", !!modal);

  const allExpertsVar = window.allExperts;
  console.log("allExperts available:", !!allExpertsVar);
  console.log("allExperts count:", allExpertsVar?.length || 0);

  return { table, viewButtons, modal, allExpertsVar };
};

// Verificar funciones disponibles
const checkFunctions = () => {
  console.log("2. Verificando funciones...");

  const functions = {
    openModalView: window.openModalView,
    openModal: window.openModal,
    bindRowActions: window.bindRowActions,
    $: window.$,
  };

  Object.entries(functions).forEach(([name, fn]) => {
    console.log(`${name}:`, typeof fn);
  });

  return functions;
};

// Simular clic manual
const testModalManually = () => {
  console.log("3. Probando modal manualmente...");

  if (typeof window.openModalView === "function") {
    console.log("Intentando abrir modal con ID: 68df21bb352469058199112a");
    window.openModalView("68df21bb352469058199112a");
  } else {
    console.error("openModalView no está disponible");
  }
};

// Ejecutar pruebas
setTimeout(() => {
  console.log("=== INICIANDO DEBUGGING ===");

  const elements = checkElements();
  const functions = checkFunctions();

  // Dar tiempo para que la página cargue completamente
  setTimeout(() => {
    testModalManually();
  }, 1000);
}, 2000);
