import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ users, setUsers, setUser, cart }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [error, setError] = useState('');
  const [signupError, setSignupError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      setUser(user);
      if (cart && cart.length > 0 && user.role !== 'administrator') {
        navigate('/checkout');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError('Incorrect username or password. Please try again.');
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (signupUsername.toLowerCase() === 'admin') {
      setSignupError('That username is reserved. Please choose another one.');
      return;
    }
    if (users.some((u) => u.username.toLowerCase() === signupUsername.toLowerCase())) {
      setSignupError('That username is already registered. Please sign in.');
      return;
    }
    
    const newUser = { name: signupName, username: signupUsername, password: signupPassword, role: 'client' };
    setUsers([...users, newUser]);
    setUser(newUser);
    if (cart && cart.length > 0) {
      navigate('/checkout');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <main className="login-layout">
      <div className="login-photo">
        <div>
          <p className="eyebrow">YOUR TABLE IS READY</p>
          <h1>Good food<br/><em>starts here.</em></h1>
        </div>
      </div>
      <section className="login-card">
        <p className="eyebrow">BISTRO ELEVEN</p>
        
        {isLogin ? (
          <div id="login-panel">
            <h2>Welcome back</h2>
            <p className="muted">Sign in to continue to the restaurant.</p>
            <form id="login-form" onSubmit={handleLogin}>
              <label htmlFor="username">Username</label>
              <input 
                id="username" 
                placeholder="Enter your username" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              
              <label htmlFor="password">Password</label>
              <input 
                id="password" 
                type="password" 
                placeholder="Enter your password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              <p id="login-error" className="error" aria-live="polite">
                {error}
              </p>
              
              <button className="button button-red" type="submit">
                Sign in <span>&rarr;</span>
              </button>
            </form>
            
            <p className="switch-auth">
              New to Bistro Eleven? <button type="button" onClick={() => setIsLogin(false)}>Create an account</button>
            </p>
            
            <div className="demo-box">
              <b>Demo Accounts:</b>
              <span>&bull; Admin: <code>admin</code> / <code>admin123</code></span>
              <span>&bull; Client: <code>user</code> / <code>user123</code></span>
            </div>
          </div>
        ) : (
          <div id="signup-panel">
            <h2>Create account</h2>
            <p className="muted">Choose your own username and password.</p>
            <form id="signup-form" onSubmit={handleSignup}>
              <label htmlFor="signup-name">Your name</label>
              <input 
                id="signup-name" 
                placeholder="Enter your name" 
                required 
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
              
              <label htmlFor="signup-username">Username</label>
              <input 
                id="signup-username" 
                placeholder="Choose a username" 
                required 
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />
              
              <label htmlFor="signup-password">Password</label>
              <input 
                id="signup-password" 
                type="password" 
                placeholder="Choose a password" 
                required 
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
              
              <p id="signup-error" className="error" aria-live="polite">
                {signupError}
              </p>
              
              <button className="button button-red" type="submit">
                Create account <span>&rarr;</span>
              </button>
            </form>
            
            <p className="switch-auth">
              Already have an account? <button type="button" onClick={() => setIsLogin(true)}>Sign in</button>
            </p>
          </div>
        )}
      </section>
    </main>
  );
};

export default Login;
