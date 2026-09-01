import { useState, useEffect } from 'react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL;

export default function App() {
  const [user, setUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(localStorage.getItem('jwtToken') || '');
  const [erro, setErro] = useState('');

  // Sempre que houver token salvo, decodifica para saber quem é o usuário
  useEffect(() => {
    if (!jwtToken) {
      setUser(null);
      return;
    }
    try {
      const dados = jwtDecode(jwtToken);
      // Verifica se o token expirou (exp está em segundos)
      if (dados.exp * 1000 < Date.now()) {
        handleLogout();
        return;
      }
      setUser(dados);
    } catch {
      handleLogout();
    }
  }, [jwtToken]);

  // Recebe o ID Token do Google e troca por um JWT da NOSSA aplicação
  const handleLoginSuccess = async (credentialResponse) => {
    setErro('');
    try {
      const resposta = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      if (!resposta.ok) throw new Error('Falha na validação do token');

      const { jwtToken: meuToken } = await resposta.json();
      localStorage.setItem('jwtToken', meuToken);
      setJwtToken(meuToken);
    } catch (e) {
      console.error(e);
      setErro('Não foi possível autenticar. O back-end está rodando na porta 5000?');
    }
  };

  const handleLogout = () => {
    googleLogout();
    localStorage.removeItem('jwtToken');
    setJwtToken('');
    setUser(null);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40, textAlign: 'center' }}>
      <h1>Gestão de Projetos</h1>

      {user ? (
        <>
          {user.picture && (
            <img src={user.picture} alt="avatar" width={80} style={{ borderRadius: '50%' }} />
          )}
          <h2>Bem-vindo(a), {user.name}!</h2>
          <p>{user.email}</p>
          <details style={{ maxWidth: 600, margin: '20px auto', textAlign: 'left' }}>
            <summary>Ver JWT emitido pelo back-end</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{jwtToken}</pre>
          </details>
          <button onClick={handleLogout}>Sair</button>
        </>
      ) : (
        <>
          <p>Faça login para acessar a plataforma.</p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={() => setErro('Erro no login com o Google.')}
            />
          </div>
        </>
      )}

      {erro && <p style={{ color: 'crimson' }}>{erro}</p>}
    </div>
  );
}