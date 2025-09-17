#!/bin/bash

# Script para corregir los templates de categorías en adminExpertos.ejs

FILE="/home/pc/Documentos/servitech-10/frontend/views/admin/adminExpertos.ejs"

echo "Corrigiendo template de categorías..."

# 1. Primero actualizar la estructura del template de categorías con debug y mejores formateos
sed -i '/<% if (typeof categorias !=='\''undefined'\''/{
:loop
n
/<% } %>/!b loop
c\
                <% if (typeof categorias !== '\''undefined'\'' && Array.isArray(categorias) && categorias.length > 0) { %>\
                  <!-- Categorías encontradas: <%= categorias.length %> -->\
                  <% categorias.forEach(function(c, index) { %>\
                    <% const catId = (c && c._id) ? String(c._id) : (c && (c.nombre || c.name || c.label) ? (c.nombre || c.name || c.label) : '\'''\'' ); %>\
                    <% const catLabel = (c && (c.nombre || c.name || c.label)) ? (c.nombre || c.name || c.label) : catId; %>\
                    <!-- Debug cat <%= index %>: id="<%= catId %>", label="<%= catLabel %>" -->\
                    <% if (catId) { %>\
                      <option value="<%= catId %>"><%= catLabel %></option>\
                    <% } %>\
                  <% }); %>\
                <% } else { %>\
                  <!-- Debug: No hay categorías. Tipo: <%= typeof categorias %>, Array: <%= Array.isArray(categorias) %>, Length: <%= (categorias && categorias.length) || '\''N/A'\'' %> -->\
                  <option disabled>No hay categorías disponibles</option>\
                <% } %>
}' "$FILE"

# 2. Corregir el ID del modal de agregar (buscar por el contexto único del add_name)
sed -i '/id="add_name"/,/<!-- Categorías/{
  s/for="edit_categorias"/for="categorias"/g
  s/id="edit_categorias"/id="categorias"/g
}' "$FILE"

echo "✅ Template de categorías corregido"
echo "✅ ID del modal de agregar corregido"
