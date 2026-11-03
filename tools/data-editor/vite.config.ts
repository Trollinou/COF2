import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve(__dirname, '../../src/data');
const BACKUP_DIR = path.resolve(DATA_DIR, 'backups');
const ALLOWED_FILES = ['paths', 'profiles', 'peoples', 'equipment', 'tables'] as const;
type DataFile = typeof ALLOWED_FILES[number];

function dataApiPlugin(): Plugin {
  return {
    name: 'cof2-data-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        try {
          // 1. GET /api/data -> renvoie tous les fichiers
          if (req.method === 'GET' && req.url === '/api/data') {
            const result: Record<string, unknown> = {};
            for (const file of ALLOWED_FILES) {
              const filePath = path.join(DATA_DIR, `${file}.json`);
              const content = await fs.promises.readFile(filePath, 'utf-8');
              result[file] = JSON.parse(content);
            }
            res.statusCode = 200;
            res.end(JSON.stringify(result));
            return;
          }

          // 2. GET /api/backups -> liste des sauvegardes disponibles
          if (req.method === 'GET' && req.url === '/api/backups') {
            if (!fs.existsSync(BACKUP_DIR)) {
              res.statusCode = 200;
              res.end(JSON.stringify([]));
              return;
            }
            const files = await fs.promises.readdir(BACKUP_DIR);
            const backups = files
              .filter(f => f.endsWith('.bak'))
              .sort()
              .reverse()
              .map(f => {
                const stat = fs.statSync(path.join(BACKUP_DIR, f));
                return {
                  filename: f,
                  size: stat.size,
                  createdAt: stat.mtime.toISOString(),
                };
              });
            res.statusCode = 200;
            res.end(JSON.stringify(backups));
            return;
          }

          // 3. POST /api/data/:filename -> sauvegarde avec backup
          if (req.method === 'POST' && req.url.startsWith('/api/data/')) {
            const fileKey = req.url.replace('/api/data/', '').trim() as DataFile;
            if (!ALLOWED_FILES.includes(fileKey)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `Fichier non autorisé: ${fileKey}` }));
              return;
            }

            const chunks: Buffer[] = [];
            for await (const chunk of req) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
            }
            const bodyStr = Buffer.concat(chunks).toString('utf-8');
            const parsedData = JSON.parse(bodyStr);

            // Validation de base : doit être un tableau ou un objet
            if (!parsedData || typeof parsedData !== 'object') {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Contenu JSON invalide' }));
              return;
            }

            // Créer le dossier backups s'il n'existe pas
            if (!fs.existsSync(BACKUP_DIR)) {
              await fs.promises.mkdir(BACKUP_DIR, { recursive: true });
            }

            const targetPath = path.join(DATA_DIR, `${fileKey}.json`);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `${fileKey}.${timestamp}.bak`;
            const backupPath = path.join(BACKUP_DIR, backupFileName);

            // Copie de sauvegarde atomique
            if (fs.existsSync(targetPath)) {
              await fs.promises.copyFile(targetPath, backupPath);
            }

            // Écriture atomique dans un fichier temporaire puis renommage
            const tempPath = `${targetPath}.tmp`;
            const formatted = JSON.stringify(parsedData, null, 2) + '\n';
            await fs.promises.writeFile(tempPath, formatted, 'utf-8');
            await fs.promises.rename(tempPath, targetPath);

            // Rotation des sauvegardes : garder max 15 sauvegardes par fichier
            try {
              const allFiles = await fs.promises.readdir(BACKUP_DIR);
              const fileBackups = allFiles
                .filter(f => f.startsWith(`${fileKey}.`) && f.endsWith('.bak'))
                .sort();
              if (fileBackups.length > 15) {
                const toDelete = fileBackups.slice(0, fileBackups.length - 15);
                for (const oldFile of toDelete) {
                  await fs.promises.unlink(path.join(BACKUP_DIR, oldFile)).catch(() => {});
                }
              }
            } catch {
              // Ignore backup cleanup errors
            }

            res.statusCode = 200;
            res.end(JSON.stringify({
              success: true,
              file: fileKey,
              backup: backupFileName,
              bytes: Buffer.byteLength(formatted, 'utf-8'),
            }));
            return;
          }

          // 4. POST /api/restore/:backupFilename -> restauration d'une sauvegarde
          if (req.method === 'POST' && req.url.startsWith('/api/restore/')) {
            const backupFilename = path.basename(req.url.replace('/api/restore/', '').trim());
            const sourceBackup = path.join(BACKUP_DIR, backupFilename);
            if (!fs.existsSync(sourceBackup)) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Sauvegarde introuvable' }));
              return;
            }

            const fileKey = backupFilename.split('.')[0] as DataFile;
            if (!ALLOWED_FILES.includes(fileKey)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Fichier cible invalide' }));
              return;
            }

            const targetPath = path.join(DATA_DIR, `${fileKey}.json`);
            await fs.promises.copyFile(sourceBackup, targetPath);

            res.statusCode = 200;
            res.end(JSON.stringify({ success: true, restored: backupFilename }));
            return;
          }

          next();
        } catch (err: any) {
          console.error('[COF2 Data Editor Error]', err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err?.message || 'Erreur interne du serveur de données' }));
        }
      });
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react(), dataApiPlugin()],
  server: {
    port: 5180,
    open: true,
  },
});

