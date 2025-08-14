# 🔧 CORREÇÕES APLICADAS RENDER ↔ SUPABASE

## ✅ MUDANÇAS IMPLEMENTADAS:

### **A) server/db.ts**
```diff
+ pool.on('connect', (client) => {
+   client.query('set search_path to public');
+ });
```
- **Fix**: Força schema `public` em todas conexões
- **Objetivo**: Garantir consultas na tabela correta

### **B) server/index.ts** 
```diff
+ // Debug/health routes (sem shell)
+ app.get('/health/db', async (_req, res) => {
+   try {
+     const r = await pool.query('select now() as now');
+     res.json({ ok: true, now: r.rows[0].now });
+   } catch (e: any) {
+     console.error('[HEALTH/DB]', e);
+     res.status(500).json({ ok: false, error: String(e?.message || e) });
+   }
+ });

+ app.get('/debug/where', async (_req, res) => {
+   try {
+     const r = await pool.query(`
+       select current_database() as db,
+              current_user, current_schema() as schema,
+              inet_server_addr()::text as host,
+              inet_server_port() as port
+     `);
+     res.json({ ok: true, info: r.rows[0] });
+   } catch (e: any) {
+     console.error('[DEBUG/WHERE]', e);
+     res.status(500).json({ ok: false, error: String(e?.message || e) });
+   }
+ });

+ if (process.env.NODE_ENV === "production") {
+   serveStatic(app);
+   
+   // Garantir único listen - porta do Render
+   const PORT = Number(process.env.PORT) || 10000;
+   const server = app.listen(PORT, '0.0.0.0', () => {
+     console.log(`✅ Server listening on port ${PORT}`);
+   });
+   process.on('SIGTERM', () => server.close(() => process.exit(0)));
+ } else {
+   const server = setupVite(app);
+ }
```
- **Fix**: Rotas debug sem shell + único listen para produção
- **Objetivo**: Debug DB e evitar EADDRINUSE no Render

### **C) server/routes.ts**
```diff
- // Buscar usuários diretamente do Supabase incluindo Joyce
- const result = await pool.query(`
-   SELECT id, email, username, first_name, last_name, role, permissions, created_at, updated_at
-   FROM users 
-   ORDER BY created_at DESC
- `);

+ // Buscar usuários com snake_case correto
+ const sql = `
+   SELECT id, email, username, first_name, last_name, role, permissions, created_at, updated_at
+   FROM public.users 
+   ORDER BY created_at DESC
+ `;
+ const result = await pool.query(sql);

- } catch (error) {
-   console.error("Error fetching users:", error);
-   res.status(500).json({ message: "Failed to fetch users" });
- }

+ } catch (err: any) {
+   console.error('[USERS/LIST] DB error:', err);
+   return res.status(500).json({ message: 'DB error' });
+ }
```
- **Fix**: Query explicit `public.users` + try/catch com logs específicos
- **Objetivo**: Mapeamento snake_case correto e debug de erros

## 📋 PRÓXIMOS TESTES NECESSÁRIOS:

### **1. Rotas Debug (Produção)**
- `/health/db` → `{ ok: true, now: "..." }`
- `/debug/where` → `{ host: "supabase.com", port: 6543, schema: "public" }`

### **2. APIs Corrigidas**
- `/api/users` → Lista 3 usuários do Supabase
- `/api/cases` → Lista 8 casos com snake_case
- `/api/employees` → Lista 5 funcionários

### **3. Scripts Render**
- **Build**: `npm run build` (vite + esbuild)
- **Start**: `node dist/index.js` (único listen)

## 🚀 STATUS RENDER-SUPABASE:

### **✅ CORRIGIDO:**
- ✅ SSL + schema public forçado
- ✅ Debug routes sem shell
- ✅ Snake_case queries explícitas
- ✅ Try/catch com logs específicos
- ✅ Único listen para produção

### **🔄 TESTANDO:**
- API users com public.users
- Rotas debug funcionais
- Deploy Render sem EADDRINUSE

---

**OBJETIVO**: Sistema 100% sincronizado Render ↔ Supabase com debug completo e zero conflitos de porta.