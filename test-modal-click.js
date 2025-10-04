// Test script para debugging modal
// Este archivo no será commiteado

// Simular un clic en el botón Ver
function testModalClick() {
  const button = document.querySelector(
    '.btn-view[data-id="68df21bb352469058199112a"]'
  );
  if (button) {
    console.log("Found button:", button);
    button.click();
  } else {
    console.log("Button not found");
    // Intentar con el primer botón disponible
    const anyButton = document.querySelector(".btn-view");
    if (anyButton) {
      console.log("Clicking first available button:", anyButton);
      anyButton.click();
    }
  }
}

// Ejecutar después de que la página se cargue
setTimeout(testModalClick, 3000);
