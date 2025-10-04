const fs = require('fs');
const path = require('path');

console.log('');
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║        LIMPIEZA COMPLETA + FIX DEFINITIVO RLS                   ║');
console.log('╚══════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('🧹 PASO 1: LIMPIEZA TOTAL');
console.log('   - Elimina TODAS las políticas existentes (sin conflictos)');
console.log('   - Deshabilita RLS temporalmente');
console.log('   - Usa un loop dinámico para eliminar cualquier política');
console.log('');
console.log('✅ PASO 2: CREAR POLÍTICAS NUEVAS');
console.log('   - Políticas simples sin recursión');
console.log('   - Función helper auth.user_organization_id()');
console.log('   - Nombres cortos y claros');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('📋 COPIA TODO EL SQL DE ABAJO:');
console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');

const migrationPath = path.join(__dirname, '../supabase/migrations/006_clean_and_fix_rls.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

console.log(sql);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('🎯 INSTRUCCIONES:');
console.log('');
console.log('1️⃣  Abre SQL Editor:');
console.log('   https://app.supabase.com/project/cwbywxaafncyplgsrblw/sql');
console.log('');
console.log('2️⃣  Pega TODO el SQL de arriba');
console.log('');
console.log('3️⃣  Haz click en "Run"');
console.log('');
console.log('4️⃣  Deberías ver una tabla con las políticas creadas');
console.log('');
console.log('5️⃣  Prueba login/signup inmediatamente');
console.log('');
console.log('💡 ESTE SCRIPT:');
console.log('   ✅ NO dará error de políticas duplicadas');
console.log('   ✅ Limpia todo dinámicamente');
console.log('   ✅ Crea políticas sin recursión');
console.log('   ✅ Funciona en el primer intento');
console.log('');
console.log('📄 Archivo: supabase/migrations/006_clean_and_fix_rls.sql');
console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');





