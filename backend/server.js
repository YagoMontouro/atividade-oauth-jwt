import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { OAuth2Client } from 'google-auth-library';

const app = express();
const PORT = process.env.PORT || 5000;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors({ origin: 'http://localhost:5173' })); // libera o front-end
app.use(express.json());

// ROTA 1: recebe o ID Token do Google, valida e devolve o NOSSO JWT
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ erro: 'Token não enviado.' });

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    const jwtToken = jwt.sign(
      {
        sub: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    console.log('✅ Login válido:', payload.email);
    return res.status(200).json({ jwtToken });
  } catch (erro) {
    console.error('❌ Token inválido:', erro.message);
    return res.status(401).json({ erro: 'Falha na autenticação.' });
  }
});

// Middleware: protege rotas exigindo o nosso JWT
function autenticar(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Token ausente.' });

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}

// ROTA 2: rota protegida — só responde com um JWT válido
app.get('/api/projetos', autenticar, (req, res) => {
  res.json({
    usuario: req.usuario.name,
    projetos: [
      { id: 1, nome: 'Site institucional', status: 'Em andamento' },
      { id: 2, nome: 'App de vendas', status: 'Concluído' },
    ],
  });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));