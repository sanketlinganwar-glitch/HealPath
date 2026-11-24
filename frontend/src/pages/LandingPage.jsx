import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Ticket,
  Search,
  Monitor,
  Users,
  Clock,
  Sparkles,
  Stethoscope,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Calendar,
  Mic,
  HeartPulse,
  MapPin,
  QrCode,
  Building2,
  Activity,
  Heart,
  Baby,
  Bone,
  Eye,
  AlertTriangle,
  ChevronRight,
  Award,
  BadgeAlert,
  HelpCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getDepartments, getDoctors } from '../api/client';
import { resolveAssetUrl } from '../utils/assets';

export function LandingPage() {
  const [lookupPhone, setLookupPhone] = useState('');
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoFailed, setVideoFailed] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getDepartments(), getDoctors()])
      .then(([depts, docs]) => {
        setDepartments(depts);
        setDoctors(docs);
      })
      .catch((err) => console.error('Error fetching departments/doctors', err))
      .finally(() => setLoading(false));
  }, []);

  const handlePhoneLookup = (e) => {
    e.preventDefault();
    if (lookupPhone.trim().length === 10) {
      navigate(`/patient/lookup?phone=${lookupPhone.trim()}`);
    }
  };

  const getDoctorCount = (deptId) => {
    return doctors.filter((doc) => doc.department_id === deptId).length;
  };

  const departmentIcons = {
    'General Medicine': Activity,
    'Cardiology': Heart,
    'Orthopedics': Bone,
    'Pediatrics': Baby,
    'ENT': Eye,
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* SECTION B: HERO SECTION (Apollo-Inspired Healthcare Cinematic Video Hero) */}
      <section className="relative min-h-[85vh] sm:min-h-[88vh] flex items-center overflow-hidden bg-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-teal-900/30">
        {/* Full-Screen Autoplay Background Video */}
        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          {!videoFailed && (
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={resolveAssetUrl('/videos/hospital-hero-poster.jpg')}
              onError={() => setVideoFailed(true)}
              className="w-full h-full object-cover object-center scale-105 motion-reduce:hidden transition-opacity duration-1000"
            >
              <source src={resolveAssetUrl('/videos/hospital-hero.mp4')} type="video/mp4" />
              Your browser does not support video playback.
            </video>
          )}

          {/* High-Quality Poster Fallback (active on reduced motion, error, or fallback) */}
          <img
            src={resolveAssetUrl('/videos/hospital-hero-poster.jpg')}
            alt="Sanjeevan Multispecialty Hospital Infrastructure"
            className={`w-full h-full object-cover object-center ${
              videoFailed ? 'block' : 'hidden motion-reduce:block'
            }`}
          />

          {/* Dark Navy Transparent Gradient Overlays for High-Contrast Readable White Typography */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-900/80 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-transparent to-slate-950/50 z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,148,136,0.18),transparent_60%)] z-10" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-15 z-10" />
        </div>

        <div className="max-w-7xl mx-auto relative z-20 w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs sm:text-sm font-bold tracking-wider uppercase backdrop-blur-md shadow-lg shadow-teal-950/40">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>SANJEEVAN MULTISPECIALTY HOSPITAL</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight">
              Your Health.{' '}
              <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-teal-100 bg-clip-text text-transparent">
                Our Priority.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed font-normal">
              Advanced healthcare, trusted specialists, and compassionate care — all in one place.
            </p>

            {/* Quick Find My Token Search Bar */}
            <div className="pt-2 max-w-xl mx-auto lg:mx-0">
              <form
                onSubmit={handlePhoneLookup}
                className="flex items-center bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-teal-500/30 text-slate-900"
              >
                <div className="pl-3 text-slate-400">
                  <Search className="w-5 h-5 text-teal-600" />
                </div>
                <input
                  type="tel"
                  pattern="[0-9]{10}"
                  maxLength={10}
                  value={lookupPhone}
                  onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile to track live queue turn..."
                  className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent focus:outline-none font-medium"
                />
                <button
                  type="submit"
                  disabled={lookupPhone.length !== 10}
                  className="px-5 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-teal-600/30 touch-target"
                >
                  {t('trackToken') || 'Track Turn'}
                </button>
              </form>
              <p className="text-[11px] text-teal-200/80 mt-2 pl-2">
                Already registered? Track your live queue token, doctor room, and estimated waiting time instantly.
              </p>
            </div>

            {/* Hero Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
              <Link
                to="/book-appointment"
                className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg shadow-teal-500/30 flex items-center space-x-2 transition transform hover:-translate-y-0.5 touch-target tracking-wide uppercase"
              >
                <Calendar className="w-5 h-5" />
                <span>BOOK APPOINTMENT</span>
              </Link>

              <a
                href="#services"
                className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm sm:text-base rounded-xl border border-white/25 backdrop-blur-md flex items-center space-x-2 transition touch-target tracking-wide uppercase"
              >
                <Stethoscope className="w-5 h-5 text-teal-300" />
                <span>EXPLORE SERVICES</span>
              </a>

              <Link
                to="/patient/dashboard"
                className="px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-teal-300 font-bold text-sm sm:text-base rounded-xl border border-teal-500/40 backdrop-blur-md flex items-center space-x-2 transition touch-target"
              >
                <HeartPulse className="w-5 h-5 text-emerald-400" />
                <span>{t('healthWallet') || 'Health Wallet'}</span>
              </Link>
            </div>

            {/* Emergency Ribbon Badge */}
            <div className="pt-2 flex items-center justify-center lg:justify-start space-x-3 text-xs text-rose-300">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <span>24/7 Emergency & Trauma Hotline: <strong className="text-white underline">+91 95526 25262</strong></span>
            </div>
          </div>

          {/* Hero Right Card: Live Hospital Snapshot */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl text-white space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-300">OPD Status Live</span>
                </div>
                <span className="text-xs text-slate-300 font-semibold">Yavatmal OPD Hub</span>
              </div>

              {/* Verified Doctors Highlights */}
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Featured Hospital Specialists</p>
                
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-teal-400/30 flex-shrink-0 bg-teal-950/40">
                      <img
                        src={resolveAssetUrl('/images/doctors/dr_sunil_agrawal.jpg')}
                        alt="Dr. Sunil M. Agrawal"
                        loading="lazy"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Dr. Sunil M. Agrawal</h4>
                      <p className="text-xs text-teal-200">M.S. (Ortho & Surgery) • MMC 74218</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    OPD Available
                  </span>
                </div>

                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-teal-400/30 flex-shrink-0 bg-teal-950/40">
                      <img
                        src={resolveAssetUrl('/images/doctors/dr_vijay_kawalkar.jpg')}
                        alt="Dr. Vijay S. Kawalkar"
                        loading="lazy"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Dr. Vijay S. Kawalkar</h4>
                      <p className="text-xs text-teal-200">M.S. (Gen Surgery), FIAGES • MMC 65192</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    OPD Available
                  </span>
                </div>

                <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-teal-400/30 flex-shrink-0 bg-teal-950/40">
                      <img
                        src={resolveAssetUrl('/images/doctors/dr_vinay_pande.jpg')}
                        alt="Dr. Vinay Pande"
                        loading="lazy"
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Dr. Vinay Pande</h4>
                      <p className="text-xs text-teal-200">M.D. (Pulmonary Medicine) • MMC 81290</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    OPD Available
                  </span>
                </div>
              </div>

              {/* Hospital Credentials Badges */}
              <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <p className="text-lg font-black text-teal-300">12+</p>
                  <p className="text-[10px] text-slate-300">Specialists</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <p className="text-lg font-black text-emerald-300">5</p>
                  <p className="text-[10px] text-slate-300">Departments</p>
                </div>
                <div className="bg-white/5 p-2 rounded-xl border border-white/5">
                  <p className="text-lg font-black text-teal-300">24/7</p>
                  <p className="text-[10px] text-slate-300">Emergency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION C: QUICK SERVICES (Apollo-Inspired 5-Card Action Grid) */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-14 relative z-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Book Appointment */}
          <Link
            to="/book-appointment"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl hover:border-teal-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                <Calendar className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                Book Appointment
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Choose doctor, pick available time slot, and get instant digital booking code.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
              <span>Book Slot</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Link>

          {/* Card 2: Find Doctor */}
          <Link
            to="/doctors-info"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl hover:border-teal-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                Find a Doctor
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Explore verified medical specialists, qualifications, OPD rooms, and duty shifts.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
              <span>View Roster</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Link>

          {/* Card 3: Track Token */}
          <Link
            to="/patient/lookup"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl hover:border-teal-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <Ticket className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                Track Live Token
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Check active turn position, live serving token, and AI predicted wait time.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform">
              <span>Track Now</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Link>

          {/* Card 4: QR Check-In */}
          <a
            href="/checkin.html"
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg hover:shadow-xl hover:border-teal-500 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                QR Self Check-In
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Scan your mobile appointment pass at entrance camera to automatically confirm arrival.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
              <span>Camera Scan</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </a>

          {/* Card 5: AI Health Assistant */}
          <Link
            to="/voice"
            className="bg-gradient-to-br from-teal-600 to-emerald-600 text-white p-5 rounded-2xl shadow-lg hover:shadow-xl transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-white/20 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6 text-amber-300 animate-pulse" />
              </div>
              <h3 className="text-base font-bold text-white">
                AI Voice Assistant
              </h3>
              <p className="text-xs text-teal-100 mt-1 leading-relaxed">
                Ask questions in Marathi, Hindi, or English for symptom triage and department routing.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-bold text-white group-hover:translate-x-1 transition-transform">
              <span>Speak Now (मराठी/हिंदी)</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </Link>
        </div>
      </section>

      {/* SECTION D: MEDICAL SPECIALITIES (Verified Hospital Departments) */}
      <section id="specialities" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-3 py-1 rounded-full mb-2">
              <Award className="w-3.5 h-3.5 text-teal-600" />
              <span>Center of Medical Excellence</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Medical Specialities & Clinical Departments
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl">
              Equipped with specialized consultation suites, dedicated intensive care units, and experienced clinical faculties in Yavatmal.
            </p>
          </div>

          <Link
            to="/doctors-info"
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-bold text-teal-700 hover:text-teal-800 transition"
          >
            <span>View All Doctors & Rooms</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => {
            const Icon = departmentIcons[dept.name] || Activity;
            const docCount = getDoctorCount(dept.id);

            return (
              <div
                key={dept.id}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-xl hover:border-teal-400 transition-all flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full">
                      Code: {dept.code}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                    {dept.name}
                  </h3>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {dept.name === 'General Medicine' && 'Primary diagnosis, chronic disease management, fever, infections, and 24/7 intensive critical care.'}
                    {dept.name === 'Cardiology' && 'Comprehensive non-invasive cardiac evaluation, ECG, 2D Echo, hypertension, and ischemic heart conditions.'}
                    {dept.name === 'Orthopedics' && 'Fracture management, joint replacement, arthroscopy, spine health, and digital sonography diagnostics.'}
                    {dept.name === 'Pediatrics' && 'Comprehensive child health, pediatric acute care, neonatology, immunization, and maternal gynecology.'}
                    {dept.name === 'ENT' && 'Advanced diagnostic microscopy, sinus treatment, hearing evaluations, and head-and-neck surgical care.'}
                  </p>

                  <div className="flex items-center space-x-2 text-xs text-slate-600 font-medium">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <span>{docCount} Verified Specialist{docCount !== 1 ? 's' : ''} on Roster</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/doctors-info?dept=${dept.id}`}
                    className="text-xs font-bold text-teal-600 hover:text-teal-800 transition flex items-center space-x-1"
                  >
                    <span>View Doctors</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    to={`/book-appointment`}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold text-xs transition"
                  >
                    Book OPD
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION E: PATIENT INFORMATION & STEP-BY-STEP INSTRUCTIONS */}
      <section className="bg-slate-100/80 py-16 px-4 sm:px-6 lg:px-8 border-y border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Patient Care & OPD Instructions
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm">
              We have designed the hospital workflow to minimize physical lobby crowding and prioritize clinical attention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-base font-bold text-slate-900">Choose Specialist</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select your required department or physician, or use our AI symptom assistant to guide you to the right specialty.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-base font-bold text-slate-900">Book Guaranteed Slot</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Select an available consultation time slot. You receive an instant booking code and verifiable digital QR pass.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-base font-bold text-slate-900">QR Entrance Check-In</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                On hospital arrival, flash your mobile QR code at our entrance scanner kiosk to confirm your arrival instantly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="text-base font-bold text-slate-900">Relax & Track Turn</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Monitor live queue progress on lobby TV screens or your phone. Proceed directly to the doctor's room when called.
              </p>
            </div>
          </div>

          {/* Hospital Operating Hours & Timings */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-md grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">OPD Timings</h4>
                <p className="text-xs text-slate-600">Monday to Saturday: 9:00 AM – 6:00 PM</p>
                <p className="text-[11px] text-teal-600 font-semibold">Specialist Sunday clinics by appointment</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Emergency & Trauma</h4>
                <p className="text-xs text-slate-600">24 Hours / 7 Days Active Emergency Care</p>
                <p className="text-[11px] text-rose-600 font-semibold">Dedicated trauma & resuscitation unit</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Pharmacy & Diagnostics</h4>
                <p className="text-xs text-slate-600">In-house pharmacy open 24/7</p>
                <p className="text-[11px] text-emerald-600 font-semibold">Digital X-Ray, Sonography & Lab on site</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION F: CONTACT & HOSPITAL LOCATION */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Contact Details */}
          <div className="lg:col-span-5 p-8 sm:p-10 bg-slate-900 text-white flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-3 py-1 rounded-full border border-teal-800">
                <MapPin className="w-3.5 h-3.5" />
                <span>Hospital Location & Contact</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Sanjeevan Multispecialty Hospital & Research Institute
              </h3>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Physical Address:</strong>
                    <p className="text-slate-300 mt-0.5 leading-relaxed">
                      Mahadev Mandir Road, Ratanlal Plots, Yavatmal, Maharashtra, India – 445001
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <PhoneCall className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">24/7 Helpline & Ambulance:</strong>
                    <p className="text-rose-300 font-bold text-base mt-0.5">+91 95526 25262</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">OPD Operating Hours:</strong>
                    <p className="text-slate-300 mt-0.5">Mon to Sat: 9:00 AM – 6:00 PM</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 text-xs text-slate-400">
              <p>Conveniently located near Mahadev Mandir in Ratanlal Plots with dedicated ambulance parking and wheelchair accessibility.</p>
            </div>
          </div>

          {/* Interactive Map Visualizer / Guidance Card */}
          <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6 bg-slate-50">
            <div>
              <h4 className="text-lg font-bold text-slate-900 mb-2">Hospital Map & Directions</h4>
              <p className="text-xs text-slate-600 leading-relaxed mb-6">
                Direct route access from Yavatmal Bus Stand (approx. 1.8 km) via Darwha Road. Follow signs toward Mahadev Mandir, Ratanlal Plots.
              </p>

              {/* Map Illustration Box */}
              <div className="w-full h-64 rounded-2xl bg-slate-200 border border-slate-300 relative overflow-hidden flex items-center justify-center text-center p-6 shadow-inner">
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg animate-bounce">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-slate-800">Sanjeevan Multispecialty Hospital</h5>
                    <p className="text-xs text-slate-500">Ratanlal Plots, Yavatmal, MH 445001</p>
                  </div>
                  <a
                    href="https://maps.google.com/?q=Sanjeevan+Hospital+Yavatmal"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-white text-teal-700 hover:bg-teal-50 border border-teal-300 font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <span>Open in Google Maps</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-900">Car & Ambulance Parking</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Complimentary parking for emergency patients</p>
              </div>
              <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                <p className="text-xs font-bold text-slate-900">Wheelchair Assistance</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Available immediately at ground floor entrance</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
