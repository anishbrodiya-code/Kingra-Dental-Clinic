import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import './redesign.css';
import './interactions.css';
import './theme-motion.css';

class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('KDC rendering error:',error,info);}
  render(){
    if(this.state.error) return <main style={{fontFamily:'Arial,sans-serif',maxWidth:620,margin:'10vh auto',padding:32,color:'#17313d'}}><img src="/logo.png" alt="Kingra Dental Care" style={{width:60,height:60,objectFit:'contain'}}/><h1>We couldn’t load the care portal</h1><p>The app encountered an error. Refresh this page once. If it continues, open Developer Tools (F12) and share the first red Console error.</p><details><summary>Technical details</summary><pre style={{whiteSpace:'pre-wrap'}}>{String(this.state.error?.message||'Unknown error')}</pre></details><button onClick={()=>location.reload()} style={{background:'#176b60',color:'white',padding:'12px 18px',border:'none',borderRadius:8,cursor:'pointer'}}>Reload website</button></main>;
    return this.props.children;
  }
}
createRoot(document.getElementById('root')).render(<ErrorBoundary><App/></ErrorBoundary>);
import './mobile-responsive.css';
