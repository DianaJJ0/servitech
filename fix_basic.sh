#!/bin/bash

# Script para corregir templates básicos

FILE="/home/pc/Documentos/servitech-10/frontend/views/admin/adminExpertos.ejs"

echo "Aplicando correcciones básicas..."

# 1. Cambiar el primer ID de edit_categorias por categorias (modal de agregar - línea 1709)
sed -i '1709s/id="edit_categorias"/id="categorias"/' "$FILE"
sed -i '1709s/for="edit_categorias"/for="categorias"/' "$FILE"

# 2. Cambiar el primer ID de skills por habilidades (modal de agregar - línea 1858)
sed -i '1858s/id="skills"/id="habilidades"/' "$FILE"

echo "✅ IDs corregidos básicamente"
