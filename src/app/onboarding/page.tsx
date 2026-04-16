"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [step, setStep] = useState<number | 'finish'>(1);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");

  const [name, setName] = useState("");
  const [stream, setStream] = useState("");
  const [year, setYear] = useState("");
  const [batchYear, setBatchYear] = useState("");
  const [errorsStep1, setErrorsStep1] = useState<{name?:string, stream?:string, year?:string, batch?:string}>({});

  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState("");
  const [interestOptions] = useState(["Music","Filmmaking","Photography","Startups","AI & ML","Finance","Writing","Theatre","Policy","Gaming","Sports","Design","Research","Debating","Philosophy","Environment"]);
  
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const lookingForOptions = ["Build something","Hackathon team","Startup idea","Creative projects","Meet new people","Just exploring","Events & fests","Study partner"];
  
  const [errorsStep2, setErrorsStep2] = useState<{interests?:string, intent?:string}>({});

  const [bio, setBio] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [clubs, setClubs] = useState<string[]>([]);
  const [clubInput, setClubInput] = useState("");
  const [clubOptions] = useState(["Music Club","Coding Club","Drama Club","Photography Club","MUN Club","Robotics Club","Literary Club","Chess Club"]);
  const [focus, setFocus] = useState("");
  const [errorsStep3, setErrorsStep3] = useState<{focus?:string}>({});

  const addTag = (val: string, type: 'interests' | 'clubs') => {
    const cleanVal = val.replace(/^[\u{1F300}-\u{1FFFF}][\s]*/u, '').trim().replace(/,/g, '');
    if (!cleanVal || cleanVal.length > 30) return;
    if (type === 'interests') {
      if (interests.length < 10 && !interests.includes(cleanVal)) {
        setInterests([...interests, cleanVal]);
        setErrorsStep2({...errorsStep2, interests: undefined});
      }
      setInterestInput("");
    } else {
      if (clubs.length < 10 && !clubs.includes(cleanVal)) {
        setClubs([...clubs, cleanVal]);
      }
      setClubInput("");
    }
  };

  const removeTag = (val: string, type: 'interests' | 'clubs') => {
    if (type === 'interests') {
      setInterests(interests.filter(t => t !== val));
    } else {
      setClubs(clubs.filter(t => t !== val));
    }
  };

  const toggleIntent = (intent: string) => {
    if (lookingFor.includes(intent)) {
      setLookingFor(lookingFor.filter(i => i !== intent));
    } else {
      const newLF = [...lookingFor, intent];
      setLookingFor(newLF);
      if (newLF.length > 0) setErrorsStep2({...errorsStep2, intent: undefined});
    }
  };

  const previewAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = ev => setPhotoPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    const errs: any = {};
    if (!name.trim()) errs.name = "Please enter your name";
    if (!stream) errs.stream = "Please select your stream";
    if (!year) errs.year = "Please select your year";
    const batch = batchYear.trim();
    if (!batch || batch.length < 4 || isNaN(Number(batch))) errs.batch = "Please enter your batch year";
    
    setErrorsStep1(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: any = {};
    if (interests.length === 0) errs.interests = "Please add at least one interest";
    if (lookingFor.length === 0) errs.intent = "Please select at least one option";
    setErrorsStep2(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: any = {};
    if (!focus.trim()) errs.focus = "Please tell us what you're currently focused on";
    setErrorsStep3(errs);
    return Object.keys(errs).length === 0;
  };

  const goToStep = (n: number | 'finish') => {
    if (n === 2 && step === 1 && !validateStep1()) return;
    if (n === 3 && step === 2 && !validateStep2()) return;
    if (n === 'finish' && step === 3 && !validateStep3()) return;

    if (n === 'finish') {
      submitForm();
    } else {
      setStep(n);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

  const submitForm = async () => {
    setLoading(true);
    setGlobalError("");
    try {
      if (!user) {
        throw new Error("You must be logged in to complete onboarding.");
      }

      let photoUrl = null;
      if (photoFile) {
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(`${user.id}/${user.id}.jpg`, photoFile, { upsert: true });
        
        if (uploadError) throw new Error("Failed to upload photo: " + uploadError.message);

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(`${user.id}/${user.id}.jpg`);
        photoUrl = publicUrl;
      }

      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        full_name: name,
        stream: stream,
        year: year,
        batch_year: batchYear,
        interests: interests,
        looking_for: lookingFor,
        bio: bio || null,
        avatar_url: photoUrl || null,
        clubs: clubs,
        currently_focused_on: focus
      }, { onConflict: 'id' });

      if (upsertError) throw new Error("Failed to save profile: " + upsertError.message);
      
      setStep('finish');
    } catch (err: any) {
      setGlobalError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const initials = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2) : '?';

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        * { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        body {
          font-family: 'Inter', sans-serif;
          background: #1C1C28;
          color: #fff;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          overflow-x: hidden;
        }

        :root{
          --bg:#1C1C28;
          --surface:#22223A;
          --surface2:#2A2A42;
          --border:rgba(255,255,255,0.07);
          --border2:rgba(255,255,255,0.13);
          --muted:rgba(255,255,255,0.38);
          --sub:rgba(255,255,255,0.62);
          --lime:#9EF01A;
          --cyan:#22D3EE;
          --purple:#A78BFA;
          --coral:#FB7185;
        }

        .bg-glow{ position:fixed;inset:0;pointer-events:none;z-index:0; background: radial-gradient(ellipse 600px 400px at 20% 50%, rgba(158,240,26,0.04) 0%, transparent 70%), radial-gradient(ellipse 500px 350px at 80% 30%, rgba(34,211,238,0.04) 0%, transparent 70%), radial-gradient(ellipse 400px 300px at 60% 80%, rgba(167,139,250,0.03) 0%, transparent 70%); }
        .bg-dots{ position:fixed;inset:0;pointer-events:none;z-index:0; background-image:radial-gradient(circle,rgba(255,255,255,0.03) 1px,transparent 1px); background-size:32px 32px; }

        .logo-bar{ position:fixed;top:0;left:0;right:0; padding:16px 32px; display:flex;align-items:center; z-index:100; background:rgba(28,28,40,0.8); backdrop-filter:blur(20px); border-bottom:1px solid var(--border); }
        .logo-svg{ display:flex;align-items:center; }

        .onboarding-wrap{ position:relative;z-index:1; width:100%;max-width:560px; margin-top:64px; }

        .progress-wrap{ display:flex;align-items:center;justify-content:center; gap:8px;margin-bottom:32px; }
        .prog-step{ display:flex;align-items:center;gap:8px; }
        .prog-dot{ width:32px;height:32px;border-radius:50%; display:flex;align-items:center;justify-content:center; font-size:12px;font-weight:700; border:1.5px solid var(--border2); color:var(--muted);background:var(--surface); transition:all .3s ease; font-family:'Syne',sans-serif; }
        .prog-dot.active{ background:var(--lime);border-color:var(--lime); color:#111;box-shadow:0 0 16px rgba(158,240,26,0.35); }
        .prog-dot.done{ background:rgba(158,240,26,0.15);border-color:rgba(158,240,26,0.4); color:var(--lime); }
        .prog-line{ width:40px;height:1.5px; background:var(--border2);border-radius:2px; transition:background .4s ease; }
        .prog-line.done{ background:rgba(158,240,26,0.4); }

        .card{ background:rgba(34,34,58,0.85); border:1px solid var(--border); border-radius:24px; padding:40px; backdrop-filter:blur(24px); box-shadow:0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05); position:relative; overflow:hidden; }
        .card::before{ content:'';position:absolute;top:0;left:0;right:0;height:1px; background:linear-gradient(90deg, transparent, rgba(158,240,26,0.3), transparent); }

        .step{ display:none; }
        .step.active{ display:block;animation:stepIn .4s cubic-bezier(.22,.68,0,1.1) forwards; }
        @keyframes stepIn{ from{opacity:0;transform:translateY(16px);} to{opacity:1;transform:translateY(0);} }

        .step-eyebrow{ font-size:10px;font-weight:700;letter-spacing:.12em; color:var(--lime);text-transform:uppercase;margin-bottom:8px; }
        .step-title{ font-family:'Syne',sans-serif;font-size:26px;font-weight:800; color:#fff;line-height:1.2;margin-bottom:6px;letter-spacing:-.5px; }
        .step-sub{ font-size:14px;color:var(--muted);margin-bottom:28px;line-height:1.6; }

        .field{ margin-bottom:18px; }
        .field label{ display:block;font-size:12px;font-weight:600; color:var(--sub);margin-bottom:7px;letter-spacing:.02em; }

        input[type=text], input[type=file], select, textarea{ width:100%; background:rgba(255,255,255,0.04); border:1px solid var(--border2); border-radius:12px; padding:13px 16px; font-size:14px;font-family:'Inter',sans-serif; color:#fff;outline:none; transition:border-color .2s, box-shadow .2s, background .2s; appearance:none; }
        input[type=text]:focus, select:focus, textarea:focus{ border-color:rgba(158,240,26,0.5); background:rgba(255,255,255,0.06); box-shadow:0 0 0 3px rgba(158,240,26,0.08); }
        input::placeholder{ color:rgba(255,255,255,0.22); }
        textarea{ resize:none;line-height:1.6; }

        select{ cursor:pointer; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 14px center; padding-right:36px; }
        select option{ background:#22223A;color:#fff; }

        .field-row{ display:grid;grid-template-columns:1fr 1fr;gap:12px; }

        .tag-section{ margin-bottom:18px; }
        .tag-section label{ display:block;font-size:12px;font-weight:600; color:var(--sub);margin-bottom:10px;letter-spacing:.02em; }

        .tag-input-wrap{ display:flex;flex-wrap:wrap;gap:7px;align-items:center; background:rgba(255,255,255,0.04); border:1px solid var(--border2); border-radius:12px;padding:10px 12px; min-height:48px;cursor:text; transition:border-color .2s, box-shadow .2s; }
        .tag-input-wrap:focus-within{ border-color:rgba(158,240,26,0.5); box-shadow:0 0 0 3px rgba(158,240,26,0.08); }
        .tag-input-wrap input{ border:none;background:transparent;outline:none; font-size:13px;color:#fff;font-family:'Inter',sans-serif; min-width:100px;flex:1;padding:2px 4px; width:auto;border-radius:0; }
        .tag-input-wrap input::placeholder{ color:rgba(255,255,255,0.22); }

        .tag-chip{ display:inline-flex;align-items:center;gap:5px; background:rgba(158,240,26,0.12); border:1px solid rgba(158,240,26,0.28); color:var(--lime);border-radius:100px; padding:4px 10px 4px 12px; font-size:11px;font-weight:600;white-space:nowrap; animation:chipIn .2s cubic-bezier(.34,1.56,.64,1); }
        @keyframes chipIn{ from{opacity:0;transform:scale(0.8);} to{opacity:1;transform:scale(1);} }
        .tag-chip button{ background:none;border:none;cursor:pointer; color:rgba(158,240,26,0.6);padding:0; font-size:14px;line-height:1;display:flex;align-items:center; transition:color .15s; }
        .tag-chip button:hover{ color:var(--lime); }

        .tag-suggestions{ display:flex;flex-wrap:wrap;gap:6px;margin-top:10px; }
        .tag-suggest{ display:inline-flex;align-items:center;gap:5px; background:rgba(255,255,255,0.04); border:1px solid var(--border2); color:var(--sub);border-radius:100px; padding:5px 12px;font-size:11px;font-weight:600; cursor:pointer;transition:all .15s;white-space:nowrap; }
        .tag-suggest:hover{ background:rgba(158,240,26,0.08); border-color:rgba(158,240,26,0.3); color:var(--lime);transform:translateY(-1px); }
        .tag-suggest.selected{ background:rgba(158,240,26,0.12); border-color:rgba(158,240,26,0.28); color:var(--lime); }

        .intent-grid{ display:grid;grid-template-columns:1fr 1fr;gap:8px; margin-top:4px; }
        .intent-pill{ display:flex;align-items:center;gap:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border2); border-radius:12px;padding:12px 14px; cursor:pointer;transition:all .2s; font-size:13px;color:var(--sub);font-weight:500; user-select:none; }
        .intent-pill:hover{ background:rgba(255,255,255,0.06); border-color:rgba(255,255,255,0.2); color:#fff; }
        .intent-pill.selected{ background:rgba(158,240,26,0.08); border-color:rgba(158,240,26,0.35); color:#fff; }
        .intent-pill.selected .intent-icon{ transform:scale(1.15); }
        .intent-icon{ font-size:18px;transition:transform .2s;flex-shrink:0; }
        .intent-check{ margin-left:auto;width:16px;height:16px; border-radius:50%;border:1.5px solid var(--border2); display:flex;align-items:center;justify-content:center; flex-shrink:0;transition:all .2s; }
        .intent-pill.selected .intent-check{ background:var(--lime);border-color:var(--lime); }
        .intent-check svg{ display:none; }
        .intent-pill.selected .intent-check svg{ display:block; }

        .avatar-upload{ display:flex;align-items:center;gap:18px;margin-bottom:18px; }
        .avatar-preview{ width:72px;height:72px;border-radius:50%; background:var(--surface2); border:2px dashed var(--border2); display:flex;align-items:center;justify-content:center; flex-shrink:0;overflow:hidden; transition:border-color .2s;cursor:pointer;position:relative; }
        .avatar-preview:hover{ border-color:rgba(158,240,26,0.4); }
        .avatar-preview img{ width:100%;height:100%;object-fit:cover;display:none; }
        .avatar-initials{ font-family:'Syne',sans-serif;font-size:22px;font-weight:800; color:var(--lime); }
        .avatar-preview input[type=file]{ position:absolute;inset:0;opacity:0;cursor:pointer;width:100%; }
        .avatar-info{ flex:1; }
        .avatar-info p{ font-size:13px;color:var(--sub);margin-bottom:4px; }
        .avatar-info span{ font-size:11px;color:var(--muted); }

        .club-note{ font-size:11px;color:var(--muted);margin-top:6px; }

        .btn-row{ display:flex;gap:10px;margin-top:28px;align-items:center; }
        .btn-primary{ flex:1;background:var(--lime);border:none; border-radius:12px;padding:14px 28px; font-size:15px;font-family:'Inter',sans-serif; font-weight:800;color:#111;cursor:pointer; transition:transform .15s,box-shadow .15s; letter-spacing:-.1px; }
        .btn-primary:hover:not(:disabled){ transform:translateY(-2px); box-shadow:0 10px 28px rgba(158,240,26,0.28); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
        .btn-secondary{ background:transparent;border:1.5px solid var(--border2); border-radius:12px;padding:14px 20px; font-size:14px;font-family:'Inter',sans-serif; font-weight:600;color:var(--muted);cursor:pointer; transition:all .15s; }
        .btn-secondary:hover{ border-color:rgba(255,255,255,.2);color:#fff; }
        .btn-skip{ background:none;border:none;cursor:pointer; font-size:13px;color:var(--muted);font-family:'Inter',sans-serif; padding:4px;text-decoration:underline;text-underline-offset:3px; transition:color .15s;margin-left:auto; }
        .btn-skip:hover{ color:var(--sub); }

        .req{ color:var(--coral);margin-left:2px; }
        .optional-badge{ display:inline-block;font-size:9px;font-weight:700; letter-spacing:.08em;text-transform:uppercase; background:rgba(167,139,250,0.12);color:var(--purple); border:1px solid rgba(167,139,250,0.25); border-radius:4px;padding:2px 7px;margin-left:8px; vertical-align:middle; }

        #step-finish{ text-align:center; padding:20px 0; }
        .finish-icon{ width:80px;height:80px;border-radius:50%; background:rgba(158,240,26,0.1); border:2px solid rgba(158,240,26,0.3); display:flex;align-items:center;justify-content:center; margin:0 auto 24px; font-size:36px; animation:popIn .5s cubic-bezier(.34,1.56,.64,1); }
        @keyframes popIn{ from{opacity:0;transform:scale(0.5);} to{opacity:1;transform:scale(1);} }
        .finish-title{ font-family:'Syne',sans-serif;font-size:28px;font-weight:800; letter-spacing:-.5px;margin-bottom:10px; }
        .finish-sub{ font-size:15px;color:var(--muted);margin-bottom:32px;line-height:1.65; }
        .finish-avatars{ display:flex;justify-content:center;margin-bottom:28px; }
        .f-av{ width:40px;height:40px;border-radius:50%; border:2.5px solid var(--bg);margin-right:-10px; display:flex;align-items:center;justify-content:center; font-size:12px;font-weight:800;color:#111; font-family:'Syne',sans-serif; }

        .field-error{ font-size:11px;color:#FB7185;margin-top:5px; display:none; }
        .field-error.show{ display:block;animation:fadeIn .2s ease; }
        @keyframes fadeIn{ from{opacity:0;transform:translateY(-4px);} to{opacity:1;transform:translateY(0);} }
        input.error, select.error, .tag-input-wrap.error{ border-color:rgba(251,113,133,0.6) !important; box-shadow:0 0 0 3px rgba(251,113,133,0.08) !important; }
        .intent-grid.error{ border:1px solid rgba(251,113,133,0.4); border-radius:12px;padding:8px; }

        @media(max-width:600px){
          .card{ padding:28px 20px; }
          .field-row{ grid-template-columns:1fr; }
          .intent-grid{ grid-template-columns:1fr; }
          .step-title{ font-size:22px; }
          .logo-bar{ padding:14px 20px; }
        }
      `}} />

      <div className="bg-glow"></div>
      <div className="bg-dots"></div>

      <div className="logo-bar">
        <div className="logo-svg">
          <svg width="148" height="38" viewBox="0 0 420 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(18,28) scale(0.38)">
              <circle cx="36" cy="20" r="5.5" fill="#9EF01A"/>
              <circle cx="36" cy="60" r="7.5" fill="#9EF01A"/>
              <circle cx="36" cy="100" r="5.5" fill="#9EF01A"/>
              <line x1="36" y1="25.5" x2="36" y2="52.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round"/>
              <line x1="36" y1="67.5" x2="36" y2="94.5" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round"/>
              <circle cx="92" cy="20" r="5.5" fill="#9EF01A"/>
              <path d="M43 53 Q60 36 87 23" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
              <circle cx="92" cy="100" r="5.5" fill="#9EF01A"/>
              <path d="M43 67 Q60 84 87 97" stroke="#9EF01A" strokeWidth="4.5" strokeLinecap="round" fill="none"/>
            </g>
            <line x1="65" y1="16" x2="65" y2="104" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            <text x="76" y="68" fontFamily="'Syne','Inter',sans-serif" fontSize="42" fontWeight="800" fill="#FFFFFF" letterSpacing="-1.5">kinexis</text>
          </svg>
        </div>
      </div>

      <div className="onboarding-wrap">
        {step !== 'finish' && (
          <div className="progress-wrap" id="progressWrap">
            <div className="prog-step">
              <div className={`prog-dot ${step === 1 ? 'active' : 'done'}`}>1</div>
            </div>
            <div className={`prog-line ${step > 1 ? 'done' : ''}`}></div>
            <div className="prog-step">
              <div className={`prog-dot ${step === 2 ? 'active' : step > 2 ? 'done' : ''}`}>2</div>
            </div>
            <div className={`prog-line ${step > 2 ? 'done' : ''}`}></div>
            <div className="prog-step">
              <div className={`prog-dot ${step === 3 ? 'active' : ''}`}>3</div>
            </div>
          </div>
        )}

        <div className="card">
          <div className={`step ${step === 1 ? 'active' : ''}`}>
            <div className="step-eyebrow">Step 1 of 3</div>
            <div className="step-title">Let&apos;s get you started.</div>
            <div className="step-sub">Just the basics — takes 20 seconds.</div>

            <div className="field">
              <label>Your name <span className="req">*</span></label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => {setName(e.target.value); setErrorsStep1({...errorsStep1, name: undefined});}}
                onKeyDown={(e) => e.key === 'Enter' && goToStep(2)}
                placeholder="What do people call you?" 
                autoComplete="off"
                className={errorsStep1.name ? 'error' : ''}
              />
              <div className={`field-error ${errorsStep1.name ? 'show' : ''}`}>{errorsStep1.name}</div>
            </div>

            <div className="field">
              <label>Your stream / department <span className="req">*</span></label>
              <select 
                value={stream} 
                onChange={(e) => {setStream(e.target.value); setErrorsStep1({...errorsStep1, stream: undefined});}}
                className={errorsStep1.stream ? 'error' : ''}
              >
                <option value="" disabled>Pick your stream</option>
                <optgroup label="Engineering">
                  <option>Computer Science and Engineering</option>
                  <option>Electronics and Communication Engineering</option>
                  <option>Electrical and Computer Engineering</option>
                  <option>Mechanical Engineering</option>
                  <option>Chemical Engineering</option>
                  <option>Biotechnology</option>
                  <option>Civil Engineering</option>
                </optgroup>
                <optgroup label="Sciences">
                  <option>Chemistry</option>
                  <option>Mathematics</option>
                  <option>Physics</option>
                </optgroup>
                <optgroup label="Economics & Business">
                  <option>Economics</option>
                  <option>Bachelor of Management Studies (BMS)</option>
                  <option>B.Sc. (Research) in Economics and Finance</option>
                  <option>BA (Research) in Business and Management Studies</option>
                  <option>MBA</option>
                </optgroup>
                <optgroup label="Humanities & Social Sciences">
                  <option>English</option>
                  <option>History</option>
                  <option>Sociology</option>
                  <option>International Relations and Governance Studies</option>
                  <option>Psychology</option>
                </optgroup>
              </select>
              <div className={`field-error ${errorsStep1.stream ? 'show' : ''}`}>{errorsStep1.stream}</div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Year / Batch <span className="req">*</span></label>
                <select 
                  value={year} 
                  onChange={(e) => {setYear(e.target.value); setErrorsStep1({...errorsStep1, year: undefined});}}
                  className={errorsStep1.year ? 'error' : ''}
                >
                  <option value="" disabled>Your year</option>
                  <option>1st Year</option>
                  <option>2nd Year</option>
                  <option>3rd Year</option>
                  <option>4th Year</option>
                  <option>Postgrad</option>
                </select>
                <div className={`field-error ${errorsStep1.year ? 'show' : ''}`}>{errorsStep1.year}</div>
              </div>
              <div className="field">
                <label>Batch year <span className="req">*</span></label>
                <input 
                  type="text" 
                  value={batchYear}
                  onChange={(e) => {setBatchYear(e.target.value); setErrorsStep1({...errorsStep1, batch: undefined});}}
                  placeholder="e.g. 2027" 
                  maxLength={4}
                  className={errorsStep1.batch ? 'error' : ''}
                />
                <div className={`field-error ${errorsStep1.batch ? 'show' : ''}`}>{errorsStep1.batch}</div>
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-primary" onClick={() => goToStep(2)}>Continue &rarr;</button>
            </div>
          </div>

          <div className={`step ${step === 2 ? 'active' : ''}`}>
            <div className="step-eyebrow">Step 2 of 3</div>
            <div className="step-title">What&apos;s your vibe?</div>
            <div className="step-sub">Pick what fits — or type your own. No wrong answers.</div>

            <div className="tag-section">
              <label>Things you&apos;re into <span className="req">*</span></label>
              <div className={`tag-input-wrap ${errorsStep2.interests ? 'error' : ''}`} onClick={() => document.getElementById('interestInput')?.focus()}>
                {interests.map(t => (
                  <span key={t} className="tag-chip" data-val={t}>
                    {t}<button type="button" onClick={() => removeTag(t, 'interests')} aria-label="remove">×</button>
                  </span>
                ))}
                <input 
                  type="text" 
                  id="interestInput"
                  value={interestInput}
                  onChange={e => setInterestInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(interestInput, 'interests'); }
                    if (e.key === 'Backspace' && interestInput === '') {
                      if (interests.length > 0) setInterests(interests.slice(0, -1));
                    }
                  }}
                  placeholder="Type & press Enter to add..." 
                />
              </div>
              <div className={`field-error ${errorsStep2.interests ? 'show' : ''}`}>{errorsStep2.interests}</div>
              
              <div className="tag-suggestions">
                {interestOptions.map(opt => (
                  <span key={opt} 
                    className={`tag-suggest ${interests.includes(opt) ? 'selected' : ''}`} 
                    onClick={() => interests.includes(opt) ? removeTag(opt, 'interests') : addTag(opt, 'interests')}
                  >
                    {opt}
                  </span>
                ))}
              </div>
            </div>

            <div className="field" style={{marginTop: '20px'}}>
              <label>What are you looking for on Kinexis? <span className="req">*</span></label>
              <div className={`field-error ${errorsStep2.intent ? 'show' : ''}`}>{errorsStep2.intent}</div>
              <div className={`intent-grid ${errorsStep2.intent ? 'error' : ''}`}>
                {lookingForOptions.map(opt => (
                  <div key={opt} className={`intent-pill ${lookingFor.includes(opt) ? 'selected' : ''}`} onClick={() => toggleIntent(opt)}>
                    <span className="intent-icon"></span>
                    <span>{opt}</span>
                    <div className="intent-check">
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="#111" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="btn-row">
              <button className="btn-secondary" onClick={() => goToStep(1)}>&larr; Back</button>
              <button className="btn-primary" onClick={() => goToStep(3)}>Continue &rarr;</button>
            </div>
          </div>

          <div className={`step ${step === 3 ? 'active' : ''}`}>
            <div className="step-eyebrow">Step 3 of 3 — Almost done!</div>
            <div className="step-title">Finish Profiling</div>
            <div className="step-sub">All optional — skip anything, edit later.</div>

            <div className="avatar-upload">
              <div className="avatar-preview" onClick={() => document.getElementById('avatarFileInput')?.click()}>
                <span className="avatar-initials" style={{display: photoPreview ? 'none' : 'block'}}>{initials}</span>
                {photoPreview ? <img src={photoPreview} alt="" style={{display: 'block'}} /> : null}
                <input id="avatarFileInput" type="file" accept="image/*" onChange={previewAvatar} />
              </div>
              <div className="avatar-info">
                <p>Add a profile photo</p>
                <span>JPG, PNG — optional. Your initials work great too.</span>
              </div>
            </div>

            <div className="field">
              <label>One-line bio <span className="optional-badge">optional</span></label>
              <input 
                type="text" 
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="e.g. I write poetry and build apps — yes, both." 
                maxLength={80}
              />
              <div style={{fontSize: '11px', color: 'var(--muted)', marginTop: '5px', textAlign: 'right'}}>
                {bio.length} / 80
              </div>
            </div>

            <div className="tag-section">
              <label>Clubs you&apos;re part of <span className="optional-badge">optional</span></label>
              <div className="tag-input-wrap" onClick={() => document.getElementById('clubInput')?.focus()}>
                {clubs.map(t => (
                  <span key={t} className="tag-chip" data-val={t}>
                    {t}<button type="button" onClick={() => removeTag(t, 'clubs')} aria-label="remove">×</button>
                  </span>
                ))}
                <input 
                  type="text" 
                  id="clubInput" 
                  value={clubInput}
                  onChange={e => setClubInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(clubInput, 'clubs'); }
                    if (e.key === 'Backspace' && clubInput === '') {
                      if (clubs.length > 0) setClubs(clubs.slice(0, -1));
                    }
                  }}
                  placeholder="Type club name & press Enter..." 
                />
              </div>
              <div className="tag-suggestions">
                {clubOptions.map(opt => (
                  <span key={opt} 
                    className={`tag-suggest ${clubs.includes(opt) ? 'selected' : ''}`} 
                    onClick={() => clubs.includes(opt) ? removeTag(opt, 'clubs') : addTag(opt, 'clubs')}
                  >
                    {opt}
                  </span>
                ))}
              </div>
              <p className="club-note">Not in any? No worries — join one through Kinexis later.</p>
            </div>

            <div className="field">
              <label>What are you currently focused on? <span className="req">*</span></label>
              <input 
                type="text" 
                value={focus}
                onChange={(e) => {setFocus(e.target.value); setErrorsStep3({...errorsStep3, focus: undefined});}}
                placeholder="Learning guitar / Building an app / Preparing for CAT — anything goes" 
                maxLength={80}
                className={errorsStep3.focus ? 'error' : ''}
              />
              <div className={`field-error ${errorsStep3.focus ? 'show' : ''}`}>{errorsStep3.focus}</div>
            </div>

            {globalError && (
              <div className="field-error show" style={{textAlign: 'center', marginBottom: '10px'}}>{globalError}</div>
            )}

            <div className="btn-row">
              <button className="btn-secondary" onClick={() => goToStep(2)} disabled={loading}>&larr; Back</button>
              <button className="btn-primary" onClick={() => goToStep('finish')} disabled={loading}>
                {loading ? 'Saving...' : "Let's go"}
              </button>
              <button className="btn-skip" onClick={() => goToStep('finish')} disabled={loading}>Skip all</button>
            </div>
          </div>

          <div className={`step ${step === 'finish' ? 'active' : ''}`} id="step-finish">
            <div className="finish-icon">🚀</div>
            <div className="finish-title">You&apos;re in, <span id="finishName" style={{color: 'var(--lime)'}}>{name.split(' ')[0] || 'friend'}</span>.</div>
            <div className="finish-sub">Your profile is live. Time to find your people — students across every stream are already here.</div>
            <div className="finish-avatars">
              <div className="f-av" style={{background: 'var(--lime)'}}>AS</div>
              <div className="f-av" style={{background: 'var(--cyan)'}}>PK</div>
              <div className="f-av" style={{background: 'var(--purple)', color: '#fff'}}>RV</div>
              <div className="f-av" style={{background: 'var(--coral)', color: '#fff'}}>SM</div>
              <div className="f-av" style={{background: 'var(--lime)'}}>+</div>
            </div>
            <button className="btn-primary" style={{width: '100%', fontSize: '16px'}} onClick={() => router.push('/discover')}>
              Start exploring people &rarr;
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
