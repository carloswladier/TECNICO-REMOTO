import express from 'express';
import mysql from 'mysql2/promise';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Configuração da conexão MySQL (Hostinger)
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    connectTimeout: 10000, // 10 segundos de timeout
  };

  let pool: mysql.Pool | null = null;

  // Função para obter conexão (Lazy initialization)
  async function getPool() {
    if (!pool) {
      if (!process.env.DB_HOST || process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1') {
        throw new Error('CONFIG_ERROR: O DB_HOST não foi configurado corretamente nas Settings. Ele deve ser o endereço do servidor da Hostinger (ex: sqlXXX.main-hosting.eu).');
      }
      
      try {
        pool = mysql.createPool(dbConfig);
        // Testar a conexão imediatamente
        const connection = await pool.getConnection();
        connection.release();
        console.log('Conexão com Hostinger MySQL estabelecida com sucesso!');
      } catch (err: any) {
        console.error('Erro ao conectar ao MySQL:', err.message);
        throw new Error(`CONNECTION_ERROR: Não foi possível conectar ao banco da Hostinger. Verifique se o Host, Usuário e Senha estão corretos e se o acesso remoto está liberado. Detalhe: ${err.message}`);
      }
    }
    return pool;
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: !!process.env.DB_HOST });
  });

  // Login
  app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      const [rows]: any = await db.execute(
        'SELECT id, username, role, created_at FROM app_users WHERE username = ? AND password = ?',
        [username, password]
      );
      if (rows.length > 0) {
        res.json(rows[0]);
      } else {
        res.status(401).json({ error: 'Usuário ou senha inválidos' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get Orders
  app.get('/api/orders', async (req, res) => {
    const { username, role } = req.query;
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      let query = 'SELECT * FROM service_orders';
      let params: any[] = [];

      if (role !== 'ADMIN') {
        query += ' WHERE created_by = ?';
        params.push(username);
      }

      query += ' ORDER BY created_at DESC';
      const [rows] = await db.execute(query, params);
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create/Update Order
  app.post('/api/orders', async (req, res) => {
    const order = req.body;
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      if (order.id) {
        // Update
        await db.execute(
          `UPDATE service_orders SET 
            tecnico = ?, cidade = ?, data = ?, contrato = ?, status = ?, 
            tipo_os = ?, reclamacao = ?, codigo_cancelamento = ?, 
            node = ?, observacao = ? 
          WHERE id = ?`,
          [
            order.tecnico, order.cidade, order.data, order.contrato, order.status,
            order.tipo_os, order.reclamacao, order.codigo_cancelamento,
            order.node, order.observacao, order.id
          ]
        );
        res.json({ success: true });
      } else {
        // Insert
        const [result]: any = await db.execute(
          `INSERT INTO service_orders 
            (tecnico, cidade, data, contrato, status, tipo_os, reclamacao, codigo_cancelamento, node, observacao, created_at, created_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            order.tecnico, order.cidade, order.data, order.contrato, order.status,
            order.tipo_os, order.reclamacao, order.codigo_cancelamento,
            order.node, order.observacao, order.created_at, order.created_by
          ]
        );
        res.json({ id: result.insertId, ...order });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete Order
  app.delete('/api/orders/:id', async (req, res) => {
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      await db.execute('DELETE FROM service_orders WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Users Management (Admin only)
  app.get('/api/users', async (req, res) => {
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      const [rows] = await db.execute('SELECT id, username, role, created_at FROM app_users');
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    const { username, password, role } = req.body;
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      const [result]: any = await db.execute(
        'INSERT INTO app_users (username, password, role, created_at) VALUES (?, ?, ?, NOW())',
        [username, password, role]
      );
      res.json({ id: result.insertId, username, role, created_at: new Date() });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const db = await getPool();
      if (!db) return res.status(500).json({ error: 'DB not configured' });

      await db.execute('DELETE FROM app_users WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ error: err.message || 'Erro interno do servidor' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Servidor rodando em http://localhost:${PORT}`);
    console.log(`[SERVER] Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] DB_HOST configurado: ${!!process.env.DB_HOST}`);
  });
}

console.log('[SERVER] Iniciando servidor...');
startServer().catch(err => {
  console.error('[SERVER] Falha crítica ao iniciar servidor:', err);
});
