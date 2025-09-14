#!/bin/bash

# Script para corregir los templates de habilidades en adminExpertos.ejs

FILE="/home/pc/Documentos/servitech-10/frontend/views/admin/adminExpertos.ejs"

echo "Corrigiendo template de habilidades..."

# 1. Actualizar la estructura del template de habilidades con debug y mejores formateos
sed -i '/<% if (typeof habilidades !=='\''undefined'\''/{
:loop
n
/<% } %>/!b loop
c\
                <% if (typeof habilidades !== '\''undefined'\'' && Array.isArray(habilidades) && habilidades.length > 0) { %>\
                  <!-- Habilidades encontradas: <%= habilidades.length %> -->\
                  <% habilidades.forEach(function(h, index) { %>\
                    <% const habId = (h && h._id) ? String(h._id) : (h && (h.nombre || h.name || h.label) ? (h.nombre || h.name || h.label) : '\'''\'' ); %>\
                    <% const habLabel = (h && (h.nombre || h.name || h.label)) ? (h.nombre || h.name || h.label) : habId; %>\
                    <!-- Debug hab <%= index %>: id="<%= habId %>", label="<%= habLabel %>" -->\
                    <% if (habId) { %>\
                      <option value="<%= habId %>"><%= habLabel %></option>\
                    <% } %>\
                  <% }); %>\
                <% } else { %>\
                  <!-- Debug: No hay habilidades. Tipo: <%= typeof habilidades %>, Array: <%= Array.isArray(habilidades) %>, Length: <%= (habilidades && habilidades.length) || '\''N/A'\'' %> -->\
                  <option disabled>No hay habilidades disponibles</option>\
                <% } %>
}' "$FILE"

# 2. Corregir los IDs de habilidades (buscar por contexto único)
# Modal de agregar: corregir edit_habilidades a habilidades
sed -i '/id="add_name"/,/<!-- .*descripcion.*/{
  s/for="edit_habilidades"/for="habilidades"/g
  s/id="edit_habilidades"/id="habilidades"/g
}' "$FILE"

echo "✅ Template de habilidades corregido"
echo "✅ IDs de habilidades corregidos"
