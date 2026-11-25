import React,{useEffect,useState,useCallback,useRef,useLayoutEffect} from 'react';
import {CalendarDays,FolderHeart,House,MapPin,LogOut,UserRound,Check,Clock,Bell,Menu,X,ArrowRight,FileText,Users,Plus,ExternalLink,Stethoscope,RefreshCcw,ShieldCheck,Sun,Moon,ChevronRight,Upload,Phone,Mail,AlertCircle,Search,Eye,LoaderCircle,HeartPulse,Sparkles,ScanFace,ShieldPlus,Smile,AlignCenter,ArrowLeft} from 'lucide-react';
import {supabase,configured,configurationError,checkAuthEndpoint} from './supabase';
import {safeActionError,publicAuthError} from './security/validation.js';
import {uploadPatientDocument} from './services/documentService.js';
const SERVICES=['General Check-up','Teeth Cleaning','Root Canal','Dental Crown','Dental Implant','Braces Consultation','Other Dental Concern'];
const SERVICE_DETAILS=[
  'A dentist checks your teeth, gums and mouth, then explains any concerns. You can ask questions and discuss whether follow-up care is needed.',
  'A dental professional removes plaque and hardened tartar from areas brushing may miss. They can also share practical tips for caring for your gums.',
  'If the inner part of a tooth is inflamed or infected, the dentist may recommend root canal treatment to clean and seal it. An examination helps determine the right approach.',
  'A crown can cover a weakened or heavily restored tooth. Your dentist will assess the tooth and discuss materials, fit and any preparation needed.',
  'Implants are one option for replacing a missing tooth. The consultation includes reviewing gum and bone health and explaining the treatment stages.',
  'The dentist reviews tooth alignment and bite concerns, then discusses whether braces or another orthodontic approach may be appropriate.'
];
const CLINIC='Kingra Dental Care, Opposite Bharu Gate, Circular Road, Gidderbaha, Punjab';
const MAPS=`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(CLINIC)}&dir_action=navigate`;
// Country is a user-editable default, not a claim about precise device location.
const PHONE_COUNTRIES=[{code:'+91',label:'India (+91)',length:10},{code:'+1',label:'US & Canada (+1)',length:10},{code:'+44',label:'UK (+44)',length:10},{code:'+61',label:'Australia (+61)',length:9},{code:'+971',label:'UAE (+971)',length:9},{code:'+65',label:'Singapore (+65)',length:8}];
const defaultCountry=()=>'+91'; // Default to clinic country; user can change it.
const splitPhone=(raw)=>{const num=String(raw||'').replace(/[\s()-]/g,'');const country=[...PHONE_COUNTRIES].sort((a,b)=>b.code.length-a.code.length).find(c=>num.startsWith(c.code));return country?{country:country.code,local:num.slice(country.code.length)}:{country:defaultCountry(),local:num.replace(/^\+/, '')}};
const joinPhone=(country,local)=>country+String(local||'').replace(/\D/g,'');
function PhoneInput({country,setCountry,value,onChange,required=true}){const selected=PHONE_COUNTRIES.find(c=>c.code===country)||PHONE_COUNTRIES[0];return <div className="phone-field"><select aria-label="Country calling code" value={country} onChange={e=>setCountry(e.target.value)}>{PHONE_COUNTRIES.map(c=><option key={c.code} value={c.code}>{c.label}</option>)}</select><input type="tel" inputMode="numeric" autoComplete="tel-national" required={required} value={value} onChange={e=>onChange(e.target.value.replace(/\D/g,''))} placeholder="Mobile number" maxLength={15} aria-label="Mobile number without country code"/><span className="phone-country-hint">{selected.code} is added automatically</span></div>}

const prettyDate=d=>d?new Date(`${d}T12:00:00`).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}):'—';
const prettyTime=t=>t?new Date(`2000-01-01T${t}`).toLocaleTimeString('en-IN',{hour:'numeric',minute:'2-digit'}):'—';
const slots=Array.from({length:21},(_,i)=>`${String(9+Math.floor((30+i*30)/60)).padStart(2,'0')}:${String((30+i*30)%60).padStart(2,'0')}`);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function IconBrand(){return <div className="brand"><span className="brand-logo-frame"><img src="/logo.png" alt="" className="brand-original-logo" /></span><span><strong>Kingra</strong><small>DENTAL CARE</small></span></div>}
function ThemeToggle(){const [dark,setDark]=useState(()=>{try{return document.documentElement.dataset.theme==='dark'}catch{return false}});useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#101C22':'#F5F7F8');try{localStorage.setItem('kdc-theme',dark?'dark':'light')}catch{}},[dark]);return <button className="theme-toggle" type="button" aria-label={dark?'Switch to light mode':'Switch to dark mode'} title={dark?'Light mode':'Dark mode'} aria-pressed={dark} onClick={()=>setDark(v=>!v)}>{dark?<Sun size={18}/>:<Moon size={18}/>}<span>{dark?'Light':'Dark'}</span></button>}
function Notice({kind='info',children}){return <div className={`notice ${kind}`} role="status">{children}</div>}
function Pill({status}){return <span className={`pill ${status}`}>{({pending:'Waiting for approval',confirmed:'Confirmed',declined:'Declined',completed:'Completed',cancelled:'Cancelled'})[status]||status}</span>}
const portalItems = [
  {id:'home', doctorLabel:'Overview', patientLabel:'Home', mobileLabel:'Home', Icon:House},
  {id:'appointments', doctorLabel:'Appointments', patientLabel:'My Appointments', mobileLabel:'Visits', Icon:CalendarDays},
  {id:'patients', doctorLabel:'Patients', mobileLabel:'Patients', Icon:Users},
  {id:'records', doctorLabel:'Patient Records', patientLabel:'My Records', mobileLabel:'Records', Icon:FolderHeart},
  {id:'personal', doctorLabel:'Personal Info', patientLabel:'Personal Info', mobileLabel:'Profile', Icon:UserRound},
];

function Shell({tab,setTab,profile,children,onLogout,notifications=[]}) {
  const doctor = profile.role === 'doctor';
  const items = doctor ? portalItems : portalItems.filter(item => item.patientLabel);
  const activeIndex = Math.max(0, items.findIndex(item => item.id === tab));
  const hasUnread = notifications.some(notification => !notification.read);
  return (
    <div className="workspace portal-workspace">
      <a className="skip-link" href="#portal-main">Skip to main content</a>
      <div className="main-area">
        <header className="topbar portal-topbar">
          <IconBrand/>
          <div className="top-user">
            <ThemeToggle/>
            <span className="portal-account">{profile.full_name || (doctor ? 'Doctor' : 'Patient')}</span>
            {doctor && <button type="button" className="icon-action portal-signout portal-profile"
              aria-label="Personal Info" aria-current={tab === 'personal' ? 'page' : undefined} onClick={() => setTab('personal')}>
              <UserRound size={19} aria-hidden="true"/>
            </button>}
            <button type="button" className="icon-action portal-signout" aria-label="Sign out" title="Sign out" onClick={onLogout}>
              <LogOut size={19} aria-hidden="true"/>
            </button>
          </div>
        </header>
        <nav className="portal-nav" aria-label="Care portal" data-profile-open={doctor && tab === 'personal' ? '' : undefined} style={{'--desktop-item-count':items.length,'--active-index':activeIndex}}>
          <span className="portal-nav-pill" aria-hidden="true"/>
          {items.map(({id,doctorLabel,patientLabel,mobileLabel,Icon}) => {
            const label = doctor ? doctorLabel : patientLabel;
            const shortLabel = doctor && id === 'home' ? 'Overview' : mobileLabel;
            const unread = id === 'home' && hasUnread;
            return (
              <button type="button" key={id} className={doctor && id === 'personal' ? 'desktop-portal-item' : undefined} aria-current={tab === id ? 'page' : undefined}
                aria-label={[label, !label.toLowerCase().includes(shortLabel.toLowerCase()) && shortLabel, unread && 'unread updates'].filter(Boolean).join(', ')} onClick={() => setTab(id)}>
                <Icon size={19} aria-hidden="true"/>
                <span className="portal-nav-full">{label}</span>
                <span className="portal-nav-short">{shortLabel}</span>
                {unread && <span className="notification-dot" aria-hidden="true"/>}
              </button>
            );
          })}
        </nav>
        <main id="portal-main" className="content" tabIndex={-1}>{children}</main>
      </div>
    </div>
  );
}

function Landing({onLogin}){const[menuOpen,setMenuOpen]=useState(false);const[activeSection,setActiveSection]=useState('');const[focusedService,setFocusedService]=useState(null);useEffect(()=>{const watcher=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting)setActiveSection(e.target.id)})},{rootMargin:'-25% 0px -60% 0px'});['care','visit'].forEach(id=>{const el=document.getElementById(id);if(el)watcher.observe(el)});return()=>watcher.disconnect()},[]);return <><a className="skip-link" href="#public-main">Skip to main content</a><div className="public-nav wrap"><IconBrand/><div id="publicLinks" className={`public-links ${menuOpen?'is-open':''}`}><a className={activeSection==='care'?'in-view':''} href="#care" onClick={()=>setMenuOpen(false)}>Our services</a><a className={activeSection==='visit'?'in-view':''} href="#visit" onClick={()=>setMenuOpen(false)}>Visit us</a><button className="btn light" onClick={onLogin}>Open care portal <ArrowRight size={16}/></button></div><div className="public-utilities"><ThemeToggle/><button className="public-menu-toggle" aria-expanded={menuOpen} aria-controls="publicLinks" aria-label={menuOpen?'Close menu':'Open menu'} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={21}/>:<Menu size={21}/>}</button></div></div><main id="public-main" tabIndex={-1}><section className="hero"><div className="wrap hero-grid" data-reveal><div><div className="eyebrow"><span className="leaf-dot"/> WELCOME TO KINGRA DENTAL CARE</div><h1>Your dental care,<br/><em>all in one place.</em></h1><p className="lead">A shared space for doctors and patients. Manage visits, check updates, and find dental records — without searching through messages or paperwork.</p><div className="hero-actions"><button className="btn primary" onClick={onLogin}>Open your care portal <ArrowRight size={17}/></button><a className="btn outline" href={MAPS} target="_blank" rel="noreferrer"><MapPin size={17}/>Get directions</a></div><div className="hero-trust"><ShieldCheck size={19} strokeWidth={1.75}/> A simpler way to stay connected with your dentist.</div></div><div className="hero-visual" aria-label="Preview of the dental care portal"><div className="hero-preview"><div className="preview-header"><span className="preview-icon"><CalendarDays size={20}/></span><span><strong>Your care, connected.</strong><small>Everything you need in one place</small></span></div><strong className="preview-title">Your visits and records</strong><div className="preview-row"><CalendarDays size={16}/> See your visits and updates</div><div className="preview-row"><Check size={16}/> Stay connected with your dentist</div><div className="preview-row"><FolderHeart size={16}/> Keep important records together</div><div className="preview-footer"><span className="preview-indicator"/> Simple. Clear. Connected.</div></div>
<div className="visit-float" aria-hidden="true">
 <span className="float-icon"><CalendarDays size={19}/></span>
 <span><strong>Your visit, made simple</strong><small>Visits · Records · Updates</small></span>
</div></div></div></section><section className="section wrap" id="care" data-reveal><div className="section-kicker">DENTAL CARE</div><h2>Here for every kind of smile.</h2><p className="section-desc">From everyday check-ups to specialized dental treatment, find the care you need.</p><div className="service-grid" aria-label="Dental treatments">{[['Regular Check-ups','Routine visits to help keep your teeth and gums healthy.'],['Teeth Cleaning','Professional cleaning and preventive care.'],['Root Canal Care','Treatment to help preserve a damaged tooth.'],['Crowns & Restorations','Restore the look and function of your teeth.'],['Braces Consultation','Discuss alignment and orthodontic options.'],['Dental Implants','Explore options for replacing missing teeth.']].map(([t,d],i)=><button type="button" className={`service-card interactive-service ${focusedService===i?'expanded':''}`} key={t} aria-expanded={focusedService===i} aria-controls="service-detail-panel" onClick={()=>setFocusedService(focusedService===i?null:i)}><div className="service-icon">{React.createElement([ScanFace,Sparkles,HeartPulse,ShieldPlus,Smile,AlignCenter][i],{size:20,strokeWidth:1.75,'aria-hidden':true})}</div><h3>{t}</h3><p>{d}</p><span className="service-expand">{focusedService===i?'Show less':'Learn more'} <ChevronRight size={15}/></span></button>)}</div><div id="service-detail-panel" className={`service-detail-panel ${focusedService===null?'is-empty':''}`} aria-live="polite" aria-atomic="true">{focusedService!==null&&<><div><span className="service-detail-label">ABOUT THIS TREATMENT</span><h3>{['Regular Check-ups','Teeth Cleaning','Root Canal Care','Crowns & Restorations','Braces Consultation','Dental Implants'][focusedService]}</h3><p>{SERVICE_DETAILS[[0,1,2,3,5,4][focusedService]]}</p></div><button type="button" className="service-detail-close" onClick={()=>setFocusedService(null)} aria-label="Close treatment details"><X size={19}/></button></>}</div></section><section className="section alt" id="visit" data-reveal><div className="wrap visit-grid"><div><div className="section-kicker">FIND US</div><h2>We look forward<br/>to seeing you.</h2><p>Opposite Bharu Gate, Circular Road, Gidderbaha, Punjab</p><p className="hours">Monday–Saturday · 9:30 AM–8:00 PM<br/>Sunday · By appointment only</p><a className="btn primary" href={MAPS} target="_blank" rel="noreferrer"><MapPin size={17}/>Open in Google Maps</a></div><div className="contact-card"><span className="icon-bubble"><Stethoscope size={25}/></span><h3>Kingra Dental Care</h3><p>Care that puts your comfort first.</p><a href="tel:+919817819415"><Phone size={16}/> +91 98178-19415</a><a href={MAPS} target="_blank" rel="noreferrer"><MapPin size={16}/> Get directions <ExternalLink size={13}/></a></div></div></section></main><footer className="footer wrap"><IconBrand/><span>© {new Date().getFullYear()} Kingra Dental Care · Demo website — not for real patient records</span></footer></>}
function Login({onBack}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(() => {
    const params = [window.location.search, window.location.hash.slice(1)]
      .map(value => new URLSearchParams(value));
    return params.some(query => query.has('error') || query.has('error_description'))
      ? 'Google sign-in could not be completed. Try again.'
      : '';
  });

  async function googleLogin() {
    setBusy(true);
    setNotice('');
    try {
      await checkAuthEndpoint();
      const {error} = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {redirectTo: window.location.origin},
      });
      if (error) throw error;
    } catch (error) {
      setNotice(publicAuthError(error));
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true"/> Back to website
      </button>
      <div className="auth-card">
        <IconBrand/>
        <p className="section-kicker" style={{marginTop:22}}>YOUR CARE, IN ONE PLACE</p>
        <h1>Welcome to your dental care portal</h1>
        <p>Sign in with Google to open your patient or doctor portal.</p>
        {configured ? <div className="google-signin">
          <button type="button" className="btn primary full" disabled={busy} onClick={googleLogin}>
            <span className="google-mark" aria-hidden="true">G</span>
            {busy ? 'Connecting…' : 'Continue with Google'}
            <ArrowRight size={17} aria-hidden="true"/>
          </button>
          <p className="form-help">Already have an account? Use the Google account with the same email. Contact the clinic if your existing records are missing.</p>
        </div> : <Notice kind="error">{configurationError}</Notice>}
        {notice && <Notice kind="error">{notice}</Notice>}
        <p className="auth-disclaimer">New accounts start as patients. Doctor access is granted by the clinic administrator. Demo only. Use sample records.</p>
      </div>
    </main>
  );
}
function PersonalInfo({profile,user,firstTime=false,onSaved,onLogout}){
 const verifiedEmail=user?.email||'';
 const verifiedPhone=user?.phone||'';
 const [name,setName]=useState(profile?.full_name||'');
 const [phoneCountry,setPhoneCountry]=useState(()=>splitPhone(profile?.phone||verifiedPhone||'').country);
 const [phone,setPhone]=useState(()=>splitPhone(profile?.phone||verifiedPhone||'').local);
 const [email,setEmail]=useState(profile?.contact_email||verifiedEmail||'');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 useEffect(()=>{setName(profile?.full_name||'');const parsed=splitPhone(profile?.phone||verifiedPhone||'');setPhoneCountry(parsed.country);setPhone(parsed.local);setEmail(profile?.contact_email||verifiedEmail||'')},[profile?.id,profile?.full_name,profile?.phone,profile?.contact_email,verifiedPhone,verifiedEmail]);
 const identitySummary = <div className="identity-summary">
  <p><ShieldCheck size={16} aria-hidden="true"/> Verified sign-in email: <strong>{verifiedEmail||'Not linked'}</strong></p>
  <p><ShieldCheck size={16} aria-hidden="true"/> Verified sign-in phone: <strong>{verifiedPhone||'Not linked'}</strong></p>
 </div>;
 async function save(e){e.preventDefault();setError('');setNotice('');const n=name.trim(),ph=joinPhone(phoneCountry,phone),em=email.trim().toLowerCase();
 if(n.length<2||n.length>120){setError('Enter your full name (2–120 characters).');return}
 if(!/^\+[1-9]\d{7,14}$/.test(ph)){setError('Enter a valid mobile number. The country code is added automatically.');return}
 if(em.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){setError('Enter a valid contact email address.');return}
 if(verifiedEmail&&em!==verifiedEmail)setNotice('Your new contact email is not verified for sign-in.');
 if(verifiedPhone&&ph!==verifiedPhone)setNotice('Your new contact phone is not verified for sign-in.');
 setSaving(true);try{const {data,error:err}=await supabase.from('profiles').update({full_name:n,phone:ph,contact_email:em,profile_complete:true}).eq('id',user.id).select('*').single();if(err)throw err;onSaved(data);if(!firstTime)setNotice('Personal information saved.');}catch(err){setError(err.code==='PGRST204'||String(err.message||'').includes("'contact_email' column")?'Database setup needed: run supabase/02_personal_info.sql in Supabase SQL Editor, then refresh this page.':safeActionError(err))}finally{setSaving(false)} }
 return <section className={firstTime?'onboarding-layout':'profile-layout'}>
 {firstTime?<div className="onboard-welcome"><IconBrand/><p className="section-kicker">ONE MORE STEP</p><h1>Let's get to know you.</h1><p>Before entering your portal, add a few contact details so the clinic knows who to expect.</p><div className="onboard-benefit"><Check size={17}/> Your details stay in your account.</div></div>:<SectionHeading kicker="YOUR ACCOUNT" title="Personal Info" desc="View and update the contact details the clinic has for you."/>}
 <div className="panel personal-panel"><form onSubmit={save} className="personal-form"><h2>{firstTime?'Complete your details':'Your details'}</h2><label>Full name<input type="text" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={e=>setName(e.target.value)} placeholder="Your full name"/></label><label>Phone number<PhoneInput country={phoneCountry} setCountry={setPhoneCountry} value={phone} onChange={setPhone}/></label><label>Email address<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label><p className="form-help">Updating these contact details does not change the Google account you use to sign in.</p>{firstTime && identitySummary}{error&&<Notice kind="error">{error}</Notice>}{notice&&<Notice>{notice}</Notice>}<button className="btn primary" type="submit" disabled={saving}>{saving?'Saving…':firstTime?'Save & open my portal':'Save changes'} <ArrowRight size={16}/></button>{firstTime&&<button className="btn outline" type="button" onClick={onLogout}>Sign out</button>}</form></div>{!firstTime && <aside className="panel account-security"><h2>Verified sign-in details</h2>{identitySummary}</aside>}</section>
}
function SectionHeading({kicker,title,desc,action}){return <div className="page-heading"><div><p className="section-kicker">{kicker}</p><h1>{title}</h1>{desc&&<p className="muted">{desc}</p>}</div>{action}</div>}
function Empty({icon:Icon=FolderHeart,title,desc,action}){return <div className="empty"><div className="empty-icon"><Icon size={25}/></div><h3>{title}</h3><p>{desc}</p>{action}</div>}
function BookingForm({onSave,booked,loading}){const[date,setDate]=useState(''),[time,setTime]=useState(''),[service,setService]=useState(SERVICES[0]),[note,setNote]=useState('');const day=date?new Date(date+'T12:00:00').getDay():null;const allowed=slots.filter(s=>!booked.some(a=>a.visit_date===date&&a.visit_time.slice(0,5)===s&&a.status==='confirmed')&&(date!==today()||s>new Date().toTimeString().slice(0,5)));async function submit(e){e.preventDefault();if(!allowed.includes(time))return;const ok=await onSave({visit_date:date,visit_time:time,service,note:note.trim()});if(ok){setDate('');setTime('');setNote('')}}return <form className="booking-form" onSubmit={submit}><div className="field-row"><label>What do you need help with?<select value={service} onChange={e=>setService(e.target.value)}>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></label><label>Preferred date<input type="date" min={today()} required value={date} onChange={e=>{setDate(e.target.value);setTime('')}}/></label></div>{day===0&&<Notice kind="error">The clinic is closed on Sundays. Please pick another day.</Notice>}<label>Available time{date&&day!==0?<div className="slots">{allowed.length?allowed.map(s=><button type="button" key={s} className={time===s?'slot selected':'slot'} onClick={()=>setTime(s)}>{prettyTime(s)}</button>):<p className="muted">No free times left. Choose another date.</p>}</div>:<div className="slot-placeholder">Choose a weekday or Saturday to see times.</div>}</label><label>Reason for visit (optional)<textarea value={note} onChange={e=>setNote(e.target.value.slice(0,300))} placeholder="A short note to help us prepare. Please avoid sharing sensitive details." rows={3}/></label><button type="submit" className="btn primary" disabled={loading||!date||!time||day===0}>Send appointment request <ArrowRight size={17}/></button><p className="form-help">Your time is not booked until the doctor approves your request.</p></form>}
function AppointmentList({appointments,doctor=false,profiles={},onStatus,updating}){if(!appointments.length)return <Empty icon={CalendarDays} title="No appointments yet" desc={doctor?'New appointment requests will appear here.':'Request your first visit to get started.'}/>;return <div className="appointment-list">{appointments.map(a=><article className="appointment-row" key={a.id}><div className="date-tile"><strong>{new Date(a.visit_date+'T12:00:00').toLocaleDateString('en-IN',{day:'2-digit'})}</strong><span>{new Date(a.visit_date+'T12:00:00').toLocaleDateString('en-IN',{month:'short'})}</span></div><div className="appointment-detail"><div className="row-title">{doctor?(profiles[a.patient_id]?.full_name||'Patient'):a.service}</div><p>{doctor?`${a.service} · `:''}{prettyDate(a.visit_date)} at {prettyTime(a.visit_time)}</p>{a.note&&<p className="note-text">“{a.note}”</p>}</div><div className="appointment-actions"><Pill status={a.status}/>{doctor&&a.status==='pending'&&<div className="mini-actions"><button disabled={updating} className="mini-approve" onClick={()=>onStatus(a,'confirmed')}><Check size={14}/>Approve</button><button disabled={updating} className="mini-decline" onClick={()=>onStatus(a,'declined')}>Decline</button></div>}{doctor&&a.status==='confirmed'&&<button disabled={updating} className="text-link" onClick={()=>onStatus(a,'completed')}>Mark completed</button>}{!doctor&&['pending','confirmed'].includes(a.status)&&<button disabled={updating} className="text-link" onClick={()=>onStatus(a,'cancelled')}>Cancel request</button>}</div></article>)}</div>}
function DocumentList({files,openFile,doctor=false,profiles={}}){if(!files.length)return <Empty title="No files shared yet" desc={doctor?'Upload a PDF or image in the Patients section.':'When your dentist shares a document, you will see it here.'}/>;return <div className="file-list">{files.map(f=><button key={f.id} className="file-row" onClick={()=>openFile(f)}><div className="file-symbol"><FileText size={20}/></div><div className="file-info"><strong>{f.title}</strong><p>{doctor?`${profiles[f.patient_id]?.full_name||'Patient'} · `:''}{prettyDate(f.created_at?.slice(0,10))}</p></div><Eye size={17}/></button>)}</div>}
function Notifications({items,onRead}){return <section className="panel notification-panel"><div className="panel-head"><h2>Updates</h2><Bell size={18}/></div>{items.length?<div className="notification-list">{items.slice(0,6).map(n=><button key={n.id} className={n.read?'notification':'notification unread'} onClick={()=>onRead(n.id)}>{!n.read&&<span className="notification-dot"/>}<span>{n.message}</span><small>{prettyDate(n.created_at.slice(0,10))}</small></button>)}</div>:<p className="muted">Nothing new. Updates will show up here.</p>}</section>}
// No idle or scroll-triggered animation: controls respond only to deliberate interaction.
function SiteEnhancements(){return null}
function App(){const[session,setSession]=useState(null),[profile,setProfile]=useState(null),[page,setPage]=useState(()=>{
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return [query,hash].some(params => params.has('error') || params.has('error_description')) ? 'login' : 'public';
}),[tab,setTab]=useState('home'),[appointments,setAppointments]=useState([]),[profiles,setProfiles]=useState({}),[files,setFiles]=useState([]),[notifications,setNotifications]=useState([]),[selectedPatient,setSelectedPatient]=useState(null),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState(''),[previewFile,setPreviewFile]=useState(null),[previewUrl,setPreviewUrl]=useState(''),[patientSearch,setPatientSearch]=useState('');
useEffect(()=>{if(!supabase){setLoading(false);return;}supabase.auth.getSession().then(async({data})=>{if(data.session){const {data:userData,error:authError}=await supabase.auth.getUser();setSession(authError||!userData.user?null:data.session)}else setSession(null);setLoading(false)}).catch(()=>{setSession(null);setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>{setSession(s);setMessage('')});return ()=>subscription.unsubscribe()},[]);
useEffect(()=>{setTab('home');setProfiles({});setSelectedPatient(null);setPatientSearch('');setPreviewFile(null);setPreviewUrl('');setAppointments([]);setFiles([]);setNotifications([]);if(!session?.user){setProfile(null);return;}let current=true;supabase.from('profiles').select('*').eq('id',session.user.id).single().then(({data,error})=>{if(!current)return;if(error){setMessage('Your clinic profile could not be loaded. Try signing in again with the Google account associated with your clinic profile or contact the clinic.');return;}setProfile(data);setPage('portal')});return()=>{current=false}},[session?.user?.id]);
const activeUser = useRef(null);
const previewDialog = useRef(null);
useLayoutEffect(() => {
  activeUser.current = session?.user?.id || null;
  return () => { activeUser.current = null; };
}, [session?.user?.id]);
useEffect(() => {
  const dialog = previewDialog.current;
  if (!dialog) return;
  dialog.showModal();
  return () => { if (dialog.open) dialog.close(); };
}, [previewFile]);
const refresh=useCallback(async()=>{if(!profile||profile.id!==session?.user?.id||!supabase)return;const doctor=profile.role==='doctor';const [a,f,n,p]=await Promise.all([supabase.from('appointments').select('*').order('visit_date',{ascending:true}),supabase.from('documents').select('*').order('created_at',{ascending:false}),supabase.from('notifications').select('*').order('created_at',{ascending:false}).limit(30),doctor?supabase.from('profiles').select('id,full_name,phone,role').eq('role','patient'):Promise.resolve({data:[],error:null})]);if(activeUser.current!==profile.id)return;const err=[a,f,n,p].find(x=>x.error);if(err){setMessage(err.error.message);return;}setAppointments(a.data||[]);setFiles(f.data||[]);setNotifications(n.data||[]);setProfiles(Object.fromEntries((p.data||[]).map(x=>[x.id,x])));},[profile,session?.user?.id]);
useEffect(()=>{refresh()},[refresh]);useEffect(()=>{if(!profile||!supabase)return;const timer=setInterval(refresh,15000);return()=>clearInterval(timer)},[profile,refresh]);
async function act(fn){setBusy(true);setMessage('');try{await fn();await refresh()}catch(e){console.warn('KDC action failed:', e?.code||'unknown');setMessage(safeActionError(e))}finally{setBusy(false)}}
async function book(value){let ok=false;await act(async()=>{if(!SERVICES.includes(value.service)||!/^\d{4}-\d{2}-\d{2}$/.test(value.visit_date)||!slots.includes(value.visit_time)||typeof value.note!=='string'||value.note.length>300)throw new Error('Invalid appointment request');const{error}=await supabase.from('appointments').insert({service:value.service,visit_date:value.visit_date,visit_time:value.visit_time,note:value.note,patient_id:session.user.id,status:'pending'});if(error)throw error;ok=true;setMessage('Request sent. The doctor will review it.');setTab('appointments')});return ok}
async function status(a,newStatus){await act(async()=>{const{error}=await supabase.from('appointments').update({status:newStatus}).eq('id',a.id);if(error)throw error;setMessage(newStatus==='confirmed'?'Appointment approved and added to the schedule.':'Appointment updated.');})}
async function readNotice(id){await supabase.from('notifications').update({read:true}).eq('id',id);refresh()}
async function upload(patient,file,title){let uploaded=false;await act(async()=>{await uploadPatientDocument({client:supabase,patientId:patient,userId:session.user.id,file,title});uploaded=true;setMessage('File uploaded and shared with the patient.');});return uploaded;}
async function openFile(file){const owner=session.user.id;const{data,error}=await supabase.storage.from('patient-files').createSignedUrl(file.file_path,60);if(activeUser.current!==owner)return;if(error){setMessage(safeActionError(error));return;}setPreviewFile(file);setPreviewUrl(data.signedUrl)}
if(loading)return <div className="loading loading-screen" role="status"><span className="skeleton-brand"/><span className="skeleton-line"/><span className="skeleton-line short"/><span className="skeleton-card"/><span className="sr-only">Loading Kingra Dental Care…</span></div>;
if(!session||profile?.id!==session.user.id||!['doctor','patient'].includes(profile?.role)){if(session)return <div className="auth-page"><div className="auth-card"><IconBrand/><h2>Setting up your account…</h2>{(message||profile?.id===session.user.id)?<><Notice kind="error">{message||'This account does not have a supported portal role. Contact the clinic for access.'}</Notice><button className="btn outline" onClick={()=>supabase.auth.signOut()}>Return to sign in</button></>:<p>Preparing your dashboard.</p>}</div></div>;return page==='login'?<><div className="login-theme"><ThemeToggle/></div><Login onBack={()=>setPage('public')}/></>:<><SiteEnhancements/><Landing onLogin={()=>setPage('login')}/></>}
if(profile.role!=='doctor'&&!profile.profile_complete)return <><div className="onboarding-top"><ThemeToggle/></div><PersonalInfo profile={profile} user={session.user} firstTime onSaved={setProfile} onLogout={()=>supabase.auth.signOut()}/></>;
const doctor=profile.role==='doctor';const pending=appointments.filter(a=>a.status==='pending');const upcoming=appointments.filter(a=>a.status==='confirmed'&&a.visit_date>=today());const visible=appointments.filter(a=>a.visit_date>=today()||a.status!=='confirmed');const patientItems=Object.values(profiles).sort((a,b)=>a.full_name.localeCompare(b.full_name));const selected=selectedPatient&&profiles[selectedPatient]?selectedPatient:patientItems[0]?.id;const patientAppts=appointments.filter(a=>a.patient_id===selected);const patientFiles=files.filter(f=>f.patient_id===selected);const title=doctor?'Good day, Doctor':'Hello, '+(profile.full_name?.split(' ')[0]||'there');return <><Shell tab={tab} setTab={setTab} profile={profile} onLogout={()=>supabase.auth.signOut()} notifications={notifications}>{message&&<div className="flash" role="status"><span>{message}</span><button aria-label="Dismiss" onClick={()=>setMessage('')}><X size={16}/></button></div>}{tab==='personal'&&<PersonalInfo profile={profile} user={session.user} onSaved={setProfile} onLogout={()=>supabase.auth.signOut()}/>}
{tab==='home'&&<><SectionHeading kicker={doctor?'DOCTOR OVERVIEW':'YOUR DENTAL CARE'} title={title} desc={doctor?'Here is what needs your attention today.':'Your appointments and records, all in one place.'} action={<button className="btn subtle" onClick={refresh}><RefreshCcw size={16}/>Refresh</button>}/><div className="summary-grid">{(doctor?[[pending.length,'Requests to review',Clock], [upcoming.length,'Upcoming visits',CalendarDays],[patientItems.length,'Patients',Users]]:[[pending.length,'Waiting for approval',Clock],[upcoming.length,'Confirmed visits',CalendarDays],[files.length,'Shared files',FileText]]).map(([value,label,Icon])=><div className="stat" key={label}><div className="stat-top"><span>{label}</span><Icon size={20}/></div><strong>{value}</strong></div>)}</div><div className="dashboard-grid"><section className="panel"><div className="panel-head"><h2>{doctor?'Requests needing approval':'Your upcoming visits'}</h2><button className="text-link" onClick={()=>setTab('appointments')}>View all <ChevronRight size={15}/></button></div><AppointmentList appointments={(doctor?pending:appointments.filter(a=>['pending','confirmed'].includes(a.status))).slice(0,4)} doctor={doctor} profiles={profiles} onStatus={status} updating={busy}/>{!doctor&&<button className="btn primary" style={{marginTop:18}} onClick={()=>setTab('appointments')}><Plus size={17}/>Request a visit</button>}</section><Notifications items={notifications} onRead={readNotice}/></div><div className="quick-card"><div><h3>Coming to the clinic?</h3><p>Open directions and start your journey using Google Maps.</p></div><a className="btn outline" href={MAPS} target="_blank" rel="noreferrer"><MapPin size={17}/>Get directions</a></div></>}
{tab==='appointments'&&<><SectionHeading kicker="APPOINTMENTS" title={doctor?'Appointments & requests':'My appointments'} desc={doctor?'Review requests, approve visits and keep your schedule up to date.':'Request an appointment and check whether it has been approved.'}/>{doctor?<div className="appointment-layout">
 <section className="panel"><div className="panel-head"><h2>Requests to review</h2><span className="count">{pending.length} waiting</span></div>
 <AppointmentList appointments={pending} doctor profiles={profiles} onStatus={status} updating={busy}/></section>
 <section className="panel"><div className="panel-head"><h2>Visit schedule and history</h2></div>
 <AppointmentList appointments={appointments.filter(appointment => appointment.status !== 'pending').sort((a,b)=>Number(b.status==='confirmed')-Number(a.status==='confirmed')||a.visit_date.localeCompare(b.visit_date))} doctor profiles={profiles} onStatus={status} updating={busy}/></section>
 </div>:<div className="appointment-layout"><section className="panel"><div className="panel-head"><h2>Request a visit</h2></div><BookingForm booked={appointments} onSave={book} loading={busy}/></section><section className="panel"><div className="panel-head"><h2>My requests and visits</h2></div><AppointmentList appointments={appointments} onStatus={status} updating={busy}/></section></div>}</>}
{tab==='patients'&&doctor&&<><SectionHeading kicker="PATIENTS" title="Patients" desc="Find a patient, see appointment history and share documents."/><div className="patient-layout"><section className="panel"><div className="panel-head"><h2>Patient list</h2><span className="count">{patientItems.length}</span></div><label className="search-field"><Search size={17}/><input type="search" placeholder="Search patients by name or phone" aria-label="Search patients" value={patientSearch} onChange={e=>setPatientSearch(e.target.value)}/></label>{patientItems.length?<div className="patient-list">{patientItems.filter(p=>`${p.full_name||''} ${p.phone||''}`.toLowerCase().includes(patientSearch.toLowerCase())).map(p=><button key={p.id} onClick={()=>setSelectedPatient(p.id)} className={selected===p.id?'patient-item active':'patient-item'}><span className="avatar">{p.full_name?.charAt(0)?.toUpperCase()||'P'}</span><span><strong>{p.full_name||'Unnamed patient'}</strong><small>{p.phone||'Patient'}</small></span><ChevronRight size={16}/></button>)}</div>:<Empty icon={Users} title="No patients yet" desc="When a patient creates an account, they will appear here."/>}</section><section className="panel"><div className="panel-head"><h2>{profiles[selected]?.full_name||'Select a patient'}</h2></div>{selected&&<><h3 className="subhead">Appointments</h3><AppointmentList appointments={patientAppts} doctor profiles={profiles} onStatus={status} updating={busy}/><h3 className="subhead gap-top">Shared files</h3><DocumentList files={patientFiles} openFile={openFile} doctor profiles={profiles}/><UploadForm key={selected} patient={selected} onUpload={upload} busy={busy}/></>}</section></div></>}
{tab==='records'&&<><SectionHeading kicker="FILES" title={doctor?'Patient records':'My records'} desc={doctor?'Select a patient, then upload or view shared files.':'Reports and scans your dentist has shared with you.'}/>{doctor?<div className="records-layout"><section className="panel"><label>Choose patient<select value={selected||''} onChange={e=>setSelectedPatient(e.target.value)}><option value="">Choose a patient</option>{patientItems.map(p=><option value={p.id} key={p.id}>{p.full_name}</option>)}</select></label>{selected&&<><h3 className="subhead">Files shared with {profiles[selected]?.full_name}</h3><DocumentList files={patientFiles} openFile={openFile} doctor profiles={profiles}/></>}</section>{selected&&<section className="panel"><UploadForm key={selected} patient={selected} onUpload={upload} busy={busy}/></section>}</div>:<div className="panel"><DocumentList files={files} openFile={openFile}/></div>}</>}
</Shell>{previewFile&&<dialog ref={previewDialog} className="document-dialog native-preview" aria-label={`Preview ${previewFile.title}`} onCancel={e=>{e.preventDefault();setPreviewFile(null)}} onClick={e=>{if(e.target===e.currentTarget){const box=e.currentTarget.getBoundingClientRect();if(e.clientX<box.left||e.clientX>box.right||e.clientY<box.top||e.clientY>box.bottom)setPreviewFile(null)}}}><header><div><strong>{previewFile.title}</strong><p>Shared patient document</p></div><button className="icon-action" onClick={()=>setPreviewFile(null)} aria-label="Close preview"><X size={21}/></button></header><div className="document-preview">{previewFile.file_type==='application/pdf'?<iframe title={previewFile.title} src={previewUrl}/>:<img src={previewUrl} alt={previewFile.title}/>}</div><footer><a className="btn outline" href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/>Open or download</a><button className="btn primary" onClick={()=>setPreviewFile(null)}>Done</button></footer></dialog>}</>}
function UploadForm({patient,onUpload,busy}){const[file,setFile]=useState(null),[title,setTitle]=useState('');return <form className="upload-form" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;if(await onUpload(patient,file,title)){setFile(null);setTitle('');form.reset()}}}><h3>Share a file with this patient</h3><p className="muted small">PDF or image · Maximum 10 MB · Patient will be able to view it</p><div className="field-row"><label>File name<input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. X-ray — upper jaw"/></label><label>Select file<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" required onChange={e=>setFile(e.target.files?.[0]||null)}/></label></div><button disabled={!file||!title.trim()||busy} type="submit" className="btn primary">{busy?<LoaderCircle size={17} className="spin"/>:<Upload size={17}/>} {busy?'Uploading…':'Upload & share'}</button>{busy&&<p className="upload-loading" role="status">Uploading your file securely…</p>}</form>}
export default App;
