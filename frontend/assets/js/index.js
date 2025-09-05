
document.addEventListener('DOMContentLoaded', function() {

});

// FAQ Accordion Functionality
                // Permite expandir y colapsar las respuestas de las preguntas frecuentes
                document.querySelectorAll('.faq-question').forEach(button => {
                    button.addEventListener('click', () => {
                        const expanded = button.getAttribute('aria-expanded') === 'true';
                        button.setAttribute('aria-expanded', !expanded);

                        // Cierra otros ítems abiertos para mantener solo uno expandido
                        if (!expanded) {
                            document.querySelectorAll('.faq-question').forEach(otherButton => {
                                if (otherButton !== button) {
                                    otherButton.setAttribute('aria-expanded', 'false');
                                }
                            });
                        }
                    });
                });
