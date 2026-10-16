import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Activity, 
  Users, 
  FileText, 
  Plus, 
  Search, 
  Printer, 
  Settings, 
  LogOut, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Trash2, 
  UserPlus, 
  Smartphone, 
  Laptop, 
  RefreshCw, 
  User, 
  Stethoscope, 
  MapPin, 
  Phone, 
  Mail, 
  FileSignature, 
  Loader2,
  Calendar,
  ChevronRight,
  ClipboardList,
  Clock,
  Pill,
  Tag,
  Edit3,
  Cloud,
  ChevronDown,
  Download
} from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { 
  checkKvHealth, 
  saveKvDoctorProfile, 
  addKvPatient, 
  addKvPrescription, 
  addKvCatalogMed, 
  updateKvCatalogMed,
  deleteKvCatalogMed,
  type KvHealthStatus 
} from './services/kvStorage';
import { auth, db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  deleteDoc,
  updateDoc 
} from 'firebase/firestore';

interface CustomUser {
  uid: string;
  displayName?: string;
}

// Types matching our Firestore data blueprints
interface Patient {
  id: string;
  name: string;
  lastName: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  allergies: string;
  history: string;
  createdAt: string;
  createdBy: string;
}

interface MedicationItem {
  // Structured fields requested by user
  genericName?: string;         // Nombre genérico: ej. "Clobetasol"
  commercialName?: string;      // Nombre comercial: ej. "Clopicar"
  concentration?: string;       // Concentración / presentación: ej. "0,05% — tubo de 25 g"
  pharmaceuticalForm?: string;  // Forma farmacéutica: ej. "Crema"
  quantity?: string;            // Cantidad: ej. "1 tubo"
  
  // INDICACIONES en este orden
  baseInstruction?: string;     // ej. "Capa fina sobre las lesiones"
  route?: string;               // Vía de administración: ej. "Tópica"
  frequency?: string;           // Frecuencia: ej. "2 veces al día"
  applicationSite?: string;     // Lugar de aplicación: ej. "Lesiones de brazo"
  treatmentPeriod?: string;     // Período de tratamiento: ej. "3 semanas"
  fullIndication?: string;      // Vista previa generada

  // Compatibility fields
  name: string;
  dose: string;
  duration: string;
  notes: string;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  diagnosis: string;
  instructions: string;
  medications: string; // JSON string serialized
  createdAt: string;
  createdBy: string;
  doctorName: string;
  doctorLicense: string;
  clinicName: string;
}

interface CatalogMedication {
  id: string;
  genericName?: string;
  commercialName?: string;
  concentration?: string;
  pharmaceuticalForm?: string;
  quantity?: string;
  baseInstruction?: string;
  route?: string;
  frequency?: string;
  applicationSite?: string;
  treatmentPeriod?: string;
  fullIndication?: string;
  customNotes?: string;

  name: string;
  dose: string;
  duration: string;
  notes: string;
  category: string;
  createdAt: string;
  createdBy: string;
}

export interface CustomPresets {
  categories: string[];
  forms: string[];
  quantities: string[];
  baseInstructions: string[];
  routes?: string[];
  frequencies: string[];
  applicationSites: string[];
  treatmentPeriods: string[];
}

export const DEFAULT_PRESETS: CustomPresets = {
  categories: [
    'Fórmula Magistral',
    'Medicamento Comercial',
    'Cuidado Skin Care',
    'Otro'
  ],
  forms: [
    'Crema',
    'Gel',
    'Ungüento',
    'Loción',
    'Solución',
    'Cápsulas'
  ],
  quantities: [
    '1 tubo',
    '2 tubos',
    '1 frasco',
    '30 cápsulas',
    '1 caja'
  ],
  baseInstructions: [
    'Aplicar una capa fina sobre las lesiones',
    'Aplicar una capa fina',
    'Aplicar cantidad moderada',
    '1 cápsula con agua',
    '3 a 5 gotas'
  ],
  routes: [
    'Tópica',
    'Oral',
    'Subcutánea',
    'Oftálmica',
    'Ótica',
    'Inhalatoria',
    'Intramuscular'
  ],
  frequencies: [
    '2 veces al día',
    '1 vez al día',
    'Cada 12 horas',
    'Cada 8 horas',
    'Por la noche'
  ],
  applicationSites: [
    'del brazo',
    'en la cara',
    'en el cuero cabelludo',
    'en la zona afectada',
    'en la espalda',
    'en las manos'
  ],
  treatmentPeriods: [
    '7 días',
    '10 días',
    '14 días',
    '3 semanas',
    '1 mes',
    '3 meses'
  ]
};

export const DEFAULT_CATALOG_MEDICATIONS: CatalogMedication[] = [
  {
    id: 'cat_med_1',
    category: 'Fórmula Magistral',
    genericName: 'Clobetasol propionato',
    commercialName: 'Clopicar',
    concentration: '0,05 %',
    pharmaceuticalForm: 'crema',
    quantity: '1 tubo',
    baseInstruction: 'Aplicar una capa fina sobre las lesiones',
    route: 'Tópica',
    frequency: '2 veces al día',
    applicationSite: 'del brazo',
    treatmentPeriod: '3 semanas',
    fullIndication: 'Aplicar una capa fina sobre las lesiones del brazo, 2 veces al día durante 3 semanas.',
    name: 'Clobetasol propionato 0,05 % crema (Clopicar) # 1 tubo',
    dose: '0,05 % • crema • Cant: 1 tubo',
    duration: '3 semanas',
    notes: 'No aplicar en párpados ni mucosas. Evitar exposición solar.',
    createdAt: new Date().toISOString(),
    createdBy: 'karolt'
  },
  {
    id: 'cat_med_2',
    category: 'Fórmula Magistral',
    genericName: 'Minoxidil 5% + Finasteride 0,1%',
    commercialName: 'Loción Capilar Anticaída',
    concentration: 'Minoxidil 5% + Finas 0,1% — 60 ml',
    pharmaceuticalForm: 'Loción',
    quantity: '1 frasco',
    baseInstruction: '1 ml con suave masaje',
    route: 'Tópica',
    frequency: '1 vez al día por la noche',
    applicationSite: 'Cuero cabelludo',
    treatmentPeriod: '3 meses',
    fullIndication: 'Aplicar 1 ml con suave masaje por vía tópica, 1 vez al día por la noche, en cuero cabelludo, durante 3 meses.',
    name: 'Loción Capilar Anticaída (Minoxidil 5% + Finasteride 0,1%)',
    dose: 'Minoxidil 5% + Finas 0,1% — 60 ml • Loción • Cant: 1 frasco',
    duration: '3 meses',
    notes: 'Lavar bien las manos tras la aplicación.',
    createdAt: new Date().toISOString(),
    createdBy: 'karolt'
  },
  {
    id: 'cat_med_3',
    category: 'Cuidado Skin Care',
    genericName: 'Protector Solar Toque Seco FPS 50+',
    commercialName: 'Fotoprotector Facial Dermatológico',
    concentration: 'FPS 50+ con filtros UVA/UVB',
    pharmaceuticalForm: 'Gel-Crema',
    quantity: '1 frasco',
    baseInstruction: 'Cantidad abundante 20 min antes de salir',
    route: 'Tópica',
    frequency: 'Cada 3 a 4 horas durante el día',
    applicationSite: 'Cara y cuello',
    treatmentPeriod: 'Uso continuo diario',
    fullIndication: 'Aplicar cantidad abundante 20 min antes de salir por vía tópica, cada 3 a 4 horas durante el día, en cara y cuello, durante uso continuo diario.',
    name: 'Fotoprotector Facial Dermatológico (Protector Solar Toque Seco FPS 50+)',
    dose: 'FPS 50+ con filtros UVA/UVB • Gel-Crema • Cant: 1 frasco',
    duration: 'Uso continuo diario',
    notes: 'Reaplicar tras sudoración excesiva o contacto con agua.',
    createdAt: new Date().toISOString(),
    createdBy: 'karolt'
  }
];

export function FloatingOptionsInput({
  label,
  value,
  onChange,
  group,
  options = [],
  placeholder = '',
  required = false,
  onAddOption,
  onRemoveOption,
  className = ''
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  group: keyof Omit<CustomPresets, 'categories'>;
  options: string[];
  placeholder?: string;
  required?: boolean;
  onAddOption: (group: keyof Omit<CustomPresets, 'categories'>, val: string) => void;
  onRemoveOption: (group: keyof Omit<CustomPresets, 'categories'>, val: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
        setIsEditMode(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const submitAdd = () => {
    const trimmed = newVal.trim();
    if (trimmed) {
      onAddOption(group, trimmed);
      onChange(trimmed);
      setNewVal('');
      setIsAdding(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-bold text-slate-700">
            {label} {required && <span className="text-brand-rose">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-[10px] text-brand-rose hover:text-brand-rose/80 font-bold flex items-center gap-0.5 cursor-pointer bg-brand-rose/5 px-1.5 py-0.5 rounded transition"
            title="Abrir o cerrar opciones rápidas"
          >
            <span>{isOpen ? 'Cerrar' : 'Elegir'}</span>
            <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-3 pr-8 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs bg-brand-linen/10 font-medium"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-rose rounded-lg transition cursor-pointer"
          title="Abrir opciones en ventana flotante"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-rose' : ''}`} />
        </button>
      </div>

      {/* VENTANA FLOTANTE DESPLEGABLE */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-brand-border shadow-2xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150 min-w-[240px]">
          <div className="flex items-center justify-between border-b border-brand-border/60 pb-1.5">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-brand-rose" />
              <span>Opciones para {label}</span>
            </span>
            <div className="flex items-center gap-1">
              {options.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`text-[9.5px] px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-0.5 ${
                    isEditMode
                      ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                  title={isEditMode ? 'Listo' : 'Gestionar / Quitar opciones'}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  <span>{isEditMode ? 'Listo' : 'Quitar'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* List of option pills in floating window */}
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-0.5">
            {options.map((opt) => {
              const isSelected = value === opt;
              return (
                <div
                  key={opt}
                  className={`inline-flex items-center text-[11px] rounded-lg border transition ${
                    isSelected
                      ? 'bg-brand-rose text-white border-brand-rose shadow-2xs font-semibold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-brand-linen/70 hover:border-brand-rose/40 font-medium'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className="px-2.5 py-1 cursor-pointer text-left"
                  >
                    {opt}
                  </button>
                  {isEditMode && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveOption(group, opt);
                      }}
                      className={`px-1.5 py-1 hover:bg-red-500 hover:text-white transition cursor-pointer text-xs font-bold leading-none border-l ${
                        isSelected ? 'border-white/30 text-white/90' : 'border-slate-200 text-slate-400'
                      }`}
                      title={`Quitar opción "${opt}"`}
                    >
                      ×
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add custom option inside floating window */}
          <div className="pt-1.5 border-t border-brand-border/60">
            {isAdding ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newVal}
                  onChange={(e) => setNewVal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      submitAdd();
                      setIsOpen(false);
                    } else if (e.key === 'Escape') {
                      setIsAdding(false);
                    }
                  }}
                  placeholder="Escribir nueva opción..."
                  autoFocus
                  className="flex-1 px-2.5 py-1 text-xs border border-brand-rose rounded-lg bg-brand-linen/10 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => {
                    submitAdd();
                    setIsOpen(false);
                  }}
                  className="px-2 py-1 bg-brand-rose hover:bg-brand-rose/90 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-1.5 py-1 text-slate-400 hover:text-slate-600 text-xs font-bold transition cursor-pointer"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full py-1 text-[10.5px] rounded-lg border border-dashed border-brand-rose/40 text-brand-rose bg-brand-rose/5 hover:bg-brand-rose/10 font-bold transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Agregar nueva opción personalizada</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MiniOptionsChips({
  group,
  options = [],
  selectedValue,
  onSelect,
  isEditMode = false,
  onAddOption,
  onRemoveOption
}: {
  group: keyof Omit<CustomPresets, 'categories'>;
  options: string[];
  selectedValue: string;
  onSelect: (val: string) => void;
  isEditMode?: boolean;
  onAddOption: (group: keyof Omit<CustomPresets, 'categories'>, val: string) => void;
  onRemoveOption: (group: keyof Omit<CustomPresets, 'categories'>, val: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newVal, setNewVal] = useState('');
  const [localEditMode, setLocalEditMode] = useState(false);

  const activeEditMode = isEditMode || localEditMode;

  const submitAdd = () => {
    const trimmed = newVal.trim();
    if (trimmed) {
      onAddOption(group, trimmed);
      onSelect(trimmed);
      setNewVal('');
      setIsAdding(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1.5">
      {options.map((opt) => {
        const isSelected = selectedValue === opt;
        return (
          <div
            key={opt}
            className={`inline-flex items-center text-[10px] rounded border transition ${
              isSelected
                ? 'bg-brand-rose text-white border-brand-rose shadow-2xs font-semibold'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-brand-linen/70 hover:border-brand-rose/40 font-medium'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(opt)}
              className="px-2 py-0.5 cursor-pointer"
            >
              {opt}
            </button>
            {activeEditMode && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveOption(group, opt);
                }}
                className={`px-1.5 py-0.5 hover:bg-red-500 hover:text-white transition cursor-pointer text-[12px] font-bold leading-none border-l ${
                  isSelected ? 'border-white/30 text-white/90' : 'border-slate-200 text-slate-400'
                }`}
                title={`Quitar opción "${opt}"`}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {isAdding ? (
        <div className="inline-flex items-center gap-1 bg-white px-1.5 py-0.5 border border-brand-rose rounded shadow-xs">
          <input
            type="text"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitAdd();
              } else if (e.key === 'Escape') {
                setIsAdding(false);
              }
            }}
            placeholder="Nueva opción..."
            autoFocus
            className="text-[10px] outline-none w-24 bg-transparent text-slate-800 font-medium"
          />
          <button
            type="button"
            onClick={submitAdd}
            className="px-1 py-0.2 bg-brand-rose text-white rounded text-[10px] font-bold hover:bg-brand-rose/90 transition cursor-pointer"
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className="px-1 py-0.2 text-slate-400 hover:text-slate-600 text-[11px] font-bold transition cursor-pointer"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-[9.5px] px-1.5 py-0.5 rounded border border-dashed border-brand-rose/50 text-brand-rose bg-brand-rose/5 hover:bg-brand-rose/15 transition cursor-pointer flex items-center gap-1 font-semibold"
            title="Agregar nueva opción de elegir"
          >
            <Plus className="h-3 w-3" />
            <span>Opción</span>
          </button>

          {options.length > 0 && (
            <button
              type="button"
              onClick={() => setLocalEditMode(!localEditMode)}
              className={`text-[9px] px-1.5 py-0.5 rounded border transition cursor-pointer flex items-center gap-0.5 font-medium ${
                activeEditMode
                  ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                  : 'text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-200'
              }`}
              title={activeEditMode ? 'Finalizar quitar opciones' : 'Quitar opciones de esta lista'}
            >
              <Trash2 className="h-2.5 w-2.5" />
              <span>{activeEditMode ? 'Listo' : 'Quitar'}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function formatStructuredIndication({
  baseInstruction = '',
  route = '',
  frequency = '',
  applicationSite = '',
  treatmentPeriod = ''
}: {
  baseInstruction?: string;
  route?: string;
  frequency?: string;
  applicationSite?: string;
  treatmentPeriod?: string;
}): string {
  const cleanBase = (baseInstruction || '').trim();
  const cleanRoute = (route || '').trim();
  const cleanFreq = (frequency || '').trim();
  const cleanSite = (applicationSite || '').trim();
  const cleanPeriod = (treatmentPeriod || '').trim();

  if (!cleanBase && !cleanRoute && !cleanFreq && !cleanSite && !cleanPeriod) {
    return '';
  }

  // 1. Build Base Action phrase
  let actionPhrase = cleanBase;
  if (cleanBase) {
    const lowerRoute = cleanRoute.toLowerCase();
    const lowerBase = cleanBase.toLowerCase();

    if (lowerRoute.includes("tóp") || lowerRoute.includes("top") || !cleanRoute) {
      if (lowerBase.startsWith("capa fina sobre las lesiones")) {
        actionPhrase = "Aplicar una capa fina sobre las lesiones";
      } else if (lowerBase.startsWith("capa fina")) {
        actionPhrase = "Aplicar una capa fina";
      } else if (!lowerBase.startsWith("aplicar") && !lowerBase.startsWith("colocar") && !lowerBase.startsWith("untar")) {
        actionPhrase = "Aplicar " + cleanBase.charAt(0).toLowerCase() + cleanBase.slice(1);
      }
    } else if (lowerRoute.includes("oral")) {
      if (!lowerBase.startsWith("tomar") && !lowerBase.startsWith("ingerir") && !lowerBase.startsWith("beber")) {
        actionPhrase = "Tomar " + cleanBase.charAt(0).toLowerCase() + cleanBase.slice(1);
      }
    }
  }

  // 2. Attach site to action smoothly
  let mainActionAndSite = actionPhrase;
  if (cleanSite) {
    let siteText = cleanSite;
    const lowerSite = cleanSite.toLowerCase();
    const lowerAction = actionPhrase.toLowerCase();

    if (lowerAction.includes("sobre las lesiones") && (lowerSite.startsWith("lesiones de ") || lowerSite.startsWith("lesiones del "))) {
      const rest = cleanSite.replace(/^lesiones de[l]?\s+/i, "");
      siteText = "del " + rest;
    }

    if (lowerAction.endsWith("sobre las lesiones") || lowerAction.endsWith("en las lesiones")) {
      if (siteText.toLowerCase().startsWith("del ") || siteText.toLowerCase().startsWith("de ")) {
        mainActionAndSite = actionPhrase + " " + siteText;
      } else if (siteText.toLowerCase().startsWith("en ")) {
        mainActionAndSite = actionPhrase + " " + siteText;
      } else {
        mainActionAndSite = actionPhrase + " en " + siteText;
      }
    } else if (lowerAction) {
      if (siteText.toLowerCase().startsWith("en ") || siteText.toLowerCase().startsWith("sobre ") || siteText.toLowerCase().startsWith("del ")) {
        mainActionAndSite = actionPhrase + " " + siteText;
      } else {
        mainActionAndSite = actionPhrase + " en " + siteText.toLowerCase();
      }
    } else {
      mainActionAndSite = siteText;
    }
  }

  // 3. Optional route: Only include route if NOT Tópica
  let routeClause = "";
  if (cleanRoute && !cleanRoute.toLowerCase().includes("tóp") && !cleanRoute.toLowerCase().includes("top")) {
    if (cleanRoute.toLowerCase().startsWith("por vía") || cleanRoute.toLowerCase().startsWith("vía")) {
      routeClause = cleanRoute;
    } else {
      routeClause = "por vía " + cleanRoute.toLowerCase();
    }
  }

  if (routeClause) {
    mainActionAndSite = mainActionAndSite + " " + routeClause;
  }

  // 4. Frequency phrase
  const freqPhrase = cleanFreq;

  // 5. Period phrase (e.g. "durante 3 semanas")
  let periodPhrase = "";
  if (cleanPeriod) {
    const lowerPeriod = cleanPeriod.toLowerCase();
    if (lowerPeriod.startsWith("durante ") || lowerPeriod.startsWith("por ")) {
      periodPhrase = cleanPeriod;
    } else {
      periodPhrase = "durante " + lowerPeriod;
    }
  }

  // Assemble full sentence: "Aplicar una capa fina sobre las lesiones del brazo, 2 veces al día durante 3 semanas."
  let sentence = mainActionAndSite.trim();

  if (freqPhrase && periodPhrase) {
    if (sentence) {
      sentence += ", " + freqPhrase + " " + periodPhrase;
    } else {
      sentence = freqPhrase + " " + periodPhrase;
    }
  } else if (freqPhrase) {
    if (sentence) {
      sentence += ", " + freqPhrase;
    } else {
      sentence = freqPhrase;
    }
  } else if (periodPhrase) {
    if (sentence) {
      sentence += " " + periodPhrase;
    } else {
      sentence = periodPhrase;
    }
  }

  sentence = sentence.trim();
  if (sentence && !sentence.endsWith(".")) {
    sentence += ".";
  }

  if (sentence.length > 0) {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  return sentence;
}

export interface MedicationLike {
  genericName?: string;
  commercialName?: string;
  concentration?: string;
  pharmaceuticalForm?: string;
  quantity?: string;
  baseInstruction?: string;
  route?: string;
  frequency?: string;
  applicationSite?: string;
  treatmentPeriod?: string;
  fullIndication?: string;
  name?: string;
  dose?: string;
  duration?: string;
  notes?: string;
  customNotes?: string;
}

// Format Line 1: "1. Clobetasol propionato 0,05 % crema (Clopicar) # 1 tubo"
export function formatMedicationLine1(med: MedicationLike, index?: number): string {
  const prefix = typeof index === "number" ? (index + 1) + ". " : "";

  const generic = (med.genericName || "").trim();
  const commercial = (med.commercialName || "").trim();
  const concentration = (med.concentration || "").trim();
  const form = (med.pharmaceuticalForm || "").trim();
  const quantity = (med.quantity || "").trim();

  let namePart = "";

  if (generic) {
    namePart = generic;
    if (concentration && !namePart.toLowerCase().includes(concentration.toLowerCase())) {
      namePart += " " + concentration;
    }
    if (form && !namePart.toLowerCase().includes(form.toLowerCase())) {
      namePart += " " + form.toLowerCase();
    }
    if (commercial) {
      let cleanComm = commercial;
      if (form && cleanComm.toLowerCase().endsWith(form.toLowerCase())) {
        cleanComm = cleanComm.slice(0, -form.length).trim();
      }
      if (!namePart.toLowerCase().includes(cleanComm.toLowerCase())) {
        namePart += " (" + cleanComm + ")";
      }
    }
  } else if (commercial) {
    namePart = commercial;
    if (concentration && !namePart.toLowerCase().includes(concentration.toLowerCase())) {
      namePart += " " + concentration;
    }
    if (form && !namePart.toLowerCase().includes(form.toLowerCase())) {
      namePart += " " + form.toLowerCase();
    }
  } else if (med.name) {
    namePart = med.name;
  }

  // Format quantity: "# 1 tubo"
  let qtyPart = "";
  if (quantity) {
    const cleanQty = quantity.replace(/^#\s*/, "").replace(/^cant:?\s*/i, "").trim();
    if (cleanQty) {
      qtyPart = "# " + cleanQty;
    }
  }

  const fullLine = [namePart, qtyPart].filter(Boolean).join("   ").trim();
  return prefix + fullLine;
}

// Format Line 2: "Aplicar una capa fina sobre las lesiones del brazo, 2 veces al día durante 3 semanas."
export function formatMedicationLine2(med: MedicationLike): string {
  if (med.baseInstruction || med.frequency || med.applicationSite || med.treatmentPeriod) {
    const structured = formatStructuredIndication({
      baseInstruction: med.baseInstruction,
      route: med.route,
      frequency: med.frequency,
      applicationSite: med.applicationSite,
      treatmentPeriod: med.treatmentPeriod || (med as any).duration
    });
    if (structured) return structured;
  }

  if (med.fullIndication && med.fullIndication.trim()) {
    return med.fullIndication
      .replace(/\s*por vía tópica,\s*/gi, " ")
      .replace(/\s*,\s*durante\s+/gi, " durante ")
      .trim();
  }

  if (med.notes && med.notes.trim()) return med.notes.trim();
  return [med.dose, med.frequency, (med as any).duration].filter(Boolean).join(" • ");
}

interface DoctorProfile {
  name: string;
  specialty: string;
  licenseId: string;
  clinicName: string;
  address: string;
  phone: string;
  updatedAt: string;
  tiktok?: string;
  facebook?: string;
  instagram?: string;
  customPresets?: CustomPresets;
}

export function IsotypeLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 278.82 299.49" xmlns="http://www.w3.org/2000/svg" className={className}>
      <g id="Capa_2" data-name="Capa 2">
        <g id="Capa_1-2" data-name="Capa 1-2">
          {/* Circle outline */}
          <path 
            fill="#434547" 
            d="M132.94,287.4a137.14,137.14,0,0,1-94.75-42.5,139.85,139.85,0,0,1-16.48-21A136.28,136.28,0,0,1,9.56,200.08,138.92,138.92,0,0,1,88.07,20.3a141.18,141.18,0,0,1,54.22-9.73,139.4,139.4,0,0,1,125.07,92.78,137.86,137.86,0,0,1-134.42,184m0-1.14a135.84,135.84,0,0,0,26.26-1.73A131.14,131.14,0,0,0,190.84,34.69a128.16,128.16,0,0,0-24-7.72,133,133,0,0,0-25-2.9,128.82,128.82,0,0,0-49.62,7.27A131.14,131.14,0,0,0,80.47,273.47a132.21,132.21,0,0,0,26.42,9.29,135.75,135.75,0,0,0,26.09,3.5" 
            transform="translate(-0.01 0)"
          />
          {/* Left elegant leaf of the K */}
          <path 
            fill="#bf815e" 
            d="M6.17,281.25a8,8,0,0,0,1.77-.72,16.18,16.18,0,0,0,1.62-.93c1-.65,2.07-1.33,3-2.06A70.41,70.41,0,0,0,18.2,273a97.4,97.4,0,0,0,9.64-9.74A105,105,0,0,0,42,242.2q2.78-5.44,5-11.15c.72-1.89,1.41-3.79,2-5.72l1-2.94c.33-1,.65-2.06,1-3.12,2.61-8.48,5.29-17.64,8.29-26.82S65.57,174,69.54,164.74a199.14,199.14,0,0,1,14-27.21,134.8,134.8,0,0,1,9.07-12.91,101.14,101.14,0,0,1,10.93-11.83,67.38,67.38,0,0,1,13.25-9.63,38,38,0,0,1,15.38-4.83,65.63,65.63,0,0,0-7.92,12.43A113,113,0,0,0,119,123.5c-3.06,8.6-5.48,17.39-7.9,26.28-4.75,17.83-9.3,36-15.23,54.56-.75,2.32-1.54,4.63-2.32,7s-1.65,4.66-2.5,7-1.8,4.7-2.74,7.08-2,4.76-3.1,7.17c-.56,1.2-1.13,2.41-1.73,3.64l-.45.91-.48,1c-.33.63-.65,1.26-1,1.89-.67,1.25-1.38,2.48-2.1,3.71s-1.5,2.43-2.28,3.62A90.45,90.45,0,0,1,66.4,260.65a77.91,77.91,0,0,1-28,18.67,63.11,63.11,0,0,1-16.07,3.84,48.94,48.94,0,0,1-8.21.11,32.71,32.71,0,0,1-4.07-.59c-.68-.15-1.34-.33-2-.54a7.34,7.34,0,0,1-1.85-.89" 
            transform="translate(-0.01 0)"
          />
          {/* Upper right leaf of the K */}
          <path 
            fill="#dc968a" 
            d="M140.38,198.77c.58-.4,1.13-.8,1.66-1.23s1.05-.84,1.56-1.29c1-.87,2-1.72,3-2.64q2.88-2.67,5.53-5.41c3.54-3.67,6.82-7.38,9.91-11.2a80.65,80.65,0,0,0,8.09-12.2,111.79,111.79,0,0,0,6.08-13.15c1.75-4.48,3.32-9,4.84-13.41l1.09-3.15,1-3.05,2.1-6.54c1.44-4.5,3-9.21,4.62-14s3.48-9.65,5.31-14.58c3.72-9.83,7.8-19.84,12.61-29.71a190.22,190.22,0,0,1,17-28.8,132.8,132.8,0,0,1,10.84-13.17,103,103,0,0,1,12.75-11.5C257.48,6.88,268,1.67,278.83,0a118.09,118.09,0,0,0-10.5,11.85,110.77,110.77,0,0,0-8.28,12.53,170.28,170.28,0,0,0-12,26.68c-3.33,9.18-6.17,18.61-8.87,28.23s-5.26,19.42-8,29.42-5.75,20.22-10.48,30.65c-1.19,2.61-2.48,5.25-4,7.9q-1.11,2-2.35,4c-.43.66-.86,1.38-1.29,2l-1.3,1.77a110.73,110.73,0,0,1-11.6,13.25,152.15,152.15,0,0,1-13.27,11.45,162,162,0,0,1-14.26,9.71,72.15,72.15,0,0,1-15.45,7.13,53.29,53.29,0,0,1-8.27,2c-1.41.2-2.82.36-4.24.42a20.16,20.16,0,0,1-4.25-.2" 
            transform="translate(-0.01 0)"
          />
          {/* Lower right leaf of the K */}
          <path 
            fill="#c89581" 
            d="M94.3,208.83a7.26,7.26,0,0,1,1.61-.15,14.09,14.09,0,0,1,1.59.06c1,.08,2.07.19,3.1.36,2,.28,4,.73,6,1.19a84,84,0,0,1,11.07,3.56,89.13,89.13,0,0,1,18.9,10.32,102.56,102.56,0,0,1,8.1,6.44c1.28,1.14,2.55,2.3,3.78,3.5l1.87,1.84c.65.63,1.3,1.29,2,2,5.28,5.36,10.89,11.2,16.74,16.92s12,11.42,18.64,16.8a168.92,168.92,0,0,0,21.22,15,115.94,115.94,0,0,0,11.87,6.15,87.55,87.55,0,0,0,12.86,4.61,57,57,0,0,0,13.74,2.05,32.24,32.24,0,0,0,13.4-2.48A55.39,55.39,0,0,1,250,290.78a94.87,94.87,0,0,1-9-7.5c-5.71-5.28-11-10.93-16.29-16.68-10.56-11.54-21.11-23.44-32.84-35.06-1.46-1.45-3-2.88-4.47-4.33s-3.07-2.86-4.63-4.3-3.2-2.83-4.84-4.25-3.37-2.8-5.14-4.18c-.89-.69-1.8-1.37-2.73-2.06l-.69-.51-.74-.53c-.49-.34-1-.69-1.49-1-1-.68-2-1.33-3-2s-2.08-1.24-3.14-1.83a76,76,0,0,0-13.3-5.84,66.22,66.22,0,0,0-28.39-3.06,53.64,53.64,0,0,0-13.6,3.42,41.51,41.51,0,0,0-6.21,3.13,28.4,28.4,0,0,0-2.84,2c-.44.38-.88.77-1.29,1.19a6.27,6.27,0,0,0-1,1.4" 
            transform="translate(-0.01 0)"
          />
        </g>
      </g>
    </svg>
  );
}

export default function App() {
  // Auth state
  const [user, setUser] = useState<CustomUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  // App state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'prescriptions' | 'settings' | 'medications'>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [catalogMedications, setCatalogMedications] = useState<CatalogMedication[]>(() => {
    const cached = localStorage.getItem('rm_catalog_medications');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return DEFAULT_CATALOG_MEDICATIONS;
  });
  const [editingCatalogMedId, setEditingCatalogMedId] = useState<string | null>(null);
  const [catalogSaveSuccess, setCatalogSaveSuccess] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Selection states
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Search & Filter states
  const [patientSearch, setPatientSearch] = useState('');
  const [prescriptionSearch, setPrescriptionSearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Modals / Form states
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isProfileSaveSuccess, setIsProfileSaveSuccess] = useState(false);

  // Cloudflare Workers KV state
  const [kvStatus, setKvStatus] = useState<KvHealthStatus | null>(null);
  const [kvChecking, setKvChecking] = useState(false);
  const [isSyncingKv, setIsSyncingKv] = useState(false);

  // Dynamic presets state (Categories & Mini-options)
  const [presets, setPresets] = useState<CustomPresets>(() => {
    const cached = localStorage.getItem('rm_custom_presets');
    if (cached) {
      try {
        return { ...DEFAULT_PRESETS, ...JSON.parse(cached) };
      } catch (e) {
        return DEFAULT_PRESETS;
      }
    }
    return DEFAULT_PRESETS;
  });

  // Category management modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Mode to remove/manage mini-options
  const [isChipsEditMode, setIsChipsEditMode] = useState(false);

  // New Catalog Medication Form state
  const [newCatalogMed, setNewCatalogMed] = useState({
    category: 'Fórmula Magistral',
    genericName: '',
    commercialName: '',
    concentration: '',
    pharmaceuticalForm: 'Crema',
    quantity: '1 tubo',
    baseInstruction: 'Capa fina sobre las lesiones',
    route: 'Tópica',
    frequency: '2 veces al día',
    applicationSite: 'Lesiones de brazo',
    treatmentPeriod: '3 semanas',
    customNotes: ''
  });

  const calculateAge = (dobString: string) => {
    if (!dobString) return '';
    const birthDate = new Date(dobString + 'T00:00:00'); // set local time boundary
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? ` (Edad: ${age} años)` : '';
  };

  // New Patient Form
  const [patientForm, setPatientForm] = useState({
    name: '',
    lastName: '',
    dob: '',
    gender: 'Masculino',
    phone: '',
    email: '',
    allergies: '',
    history: ''
  });

  // New Prescription Form
  const [prescriptionForm, setPrescriptionForm] = useState({
    patientId: '',
    diagnosis: '',
    instructions: '',
    medications: [] as MedicationItem[]
  });
  const [medForm, setMedForm] = useState({
    genericName: '',
    commercialName: '',
    concentration: '',
    pharmaceuticalForm: 'Crema',
    quantity: '1 tubo',
    baseInstruction: 'Capa fina sobre las lesiones',
    route: 'Tópica',
    frequency: '2 veces al día',
    applicationSite: 'Lesiones de brazo',
    treatmentPeriod: '3 semanas',
    customNotes: ''
  });

  // Settings Form
  const [settingsForm, setSettingsForm] = useState<DoctorProfile>({
    name: '',
    specialty: '',
    licenseId: '',
    clinicName: '',
    address: '',
    phone: '',
    tiktok: '',
    facebook: '',
    instagram: '',
    updatedAt: ''
  });

  // Print references
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Handle Auth changes locally
  useEffect(() => {
    const storedUser = localStorage.getItem('rm_user');
    if (storedUser === 'karolt') {
      setUser({ uid: 'karolt', displayName: 'Karol' });
    }
    setAuthLoading(false);
  }, []);

  // Sync Patients (Real-time listener)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'patients'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList: Patient[] = [];
      snapshot.forEach((doc) => {
        patientList.push({ id: doc.id, ...doc.data() } as Patient);
      });
      // Sort patients manually or using order if server timestamp exists. In local tests, sorting client-side is perfect and instant.
      patientList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPatients(patientList);
    }, (error) => {
      console.error("Error loading patients in real-time:", error);
    });

    return unsubscribe;
  }, [user]);

  // Sync Prescriptions (Real-time listener)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'prescriptions'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prescriptionList: Prescription[] = [];
      snapshot.forEach((doc) => {
        prescriptionList.push({ id: doc.id, ...doc.data() } as Prescription);
      });
      prescriptionList.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setPrescriptions(prescriptionList);
    }, (error) => {
      console.error("Error loading prescriptions in real-time:", error);
    });

    return unsubscribe;
  }, [user]);

  // Sync Medications Catalog (Real-time listener)
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'medications_catalog'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: CatalogMedication[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as CatalogMedication);
      });
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setCatalogMedications(list);
    }, (error) => {
      console.error("Error loading medications catalog:", error);
    });

    return unsubscribe;
  }, [user]);

  // Sync Doctor Profile
  useEffect(() => {
    if (!user) return;

    const docRef = doc(db, 'doctors', user.uid);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as DoctorProfile;
        setDoctorProfile(data);
        setSettingsForm(data);
        if (data.customPresets) {
          setPresets(prev => ({ ...DEFAULT_PRESETS, ...data.customPresets }));
          localStorage.setItem('rm_custom_presets', JSON.stringify(data.customPresets));
        }
      } else {
        // Initial defaults
        const initialProfile: DoctorProfile = {
          name: 'Dra. Karol Talavera',
          specialty: 'Dermatología',
          licenseId: '10293847',
          clinicName: 'Centro Médico Niño Jesús',
          address: 'Av. Cañoto Nº 580, Rafael Peña. Piso 5, consultorio 512.',
          phone: '73887070',
          tiktok: '@dra.karoltalavera',
          facebook: 'Dra. Karol Talavera - Dermatóloga',
          instagram: '@dermatista',
          updatedAt: new Date().toISOString(),
          customPresets: DEFAULT_PRESETS
        };
        setDoctorProfile(initialProfile);
        setSettingsForm(initialProfile);
        // Save initial profile
        setDoc(docRef, initialProfile).catch(console.error);
      }
    });

    return unsubscribe;
  }, [user]);

  // Save presets to state, localStorage, and Firestore
  async function savePresets(newPresets: CustomPresets) {
    setPresets(newPresets);
    localStorage.setItem('rm_custom_presets', JSON.stringify(newPresets));
    if (user) {
      try {
        const docRef = doc(db, 'doctors', user.uid);
        await updateDoc(docRef, { customPresets: newPresets });
      } catch (e) {
        console.error("Error saving presets to firestore:", e);
      }
    }
  }

  function handleAddOption(group: keyof Omit<CustomPresets, 'categories'>, option: string) {
    const trimmed = option.trim();
    if (!trimmed) return;
    const currentList = presets[group] || (DEFAULT_PRESETS as any)[group] || [];
    if (currentList.includes(trimmed)) return;
    const updated = {
      ...presets,
      [group]: [...currentList, trimmed]
    };
    savePresets(updated);
  }

  function handleRemoveOption(group: keyof Omit<CustomPresets, 'categories'>, option: string) {
    const currentList = presets[group] || (DEFAULT_PRESETS as any)[group] || [];
    const updated = {
      ...presets,
      [group]: currentList.filter((item: string) => item !== option)
    };
    savePresets(updated);
  }

  function handleAddCategory(category: string) {
    const trimmed = category.trim();
    if (!trimmed) return;
    if (presets.categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      alert("Esta categoría ya existe en el sistema.");
      return;
    }
    const updated = {
      ...presets,
      categories: [...presets.categories, trimmed]
    };
    savePresets(updated);
    setNewCategoryName('');
  }

  async function handleUpdateCategory(index: number, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const oldName = presets.categories[index];
    if (oldName === trimmed) {
      setEditingCategoryIndex(null);
      return;
    }
    if (presets.categories.some((c, i) => i !== index && c.toLowerCase() === trimmed.toLowerCase())) {
      alert("Ya existe una categoría con ese nombre.");
      return;
    }
    const updatedCategories = [...presets.categories];
    updatedCategories[index] = trimmed;
    const updated = {
      ...presets,
      categories: updatedCategories
    };
    savePresets(updated);
    setEditingCategoryIndex(null);
    if (newCatalogMed.category === oldName) {
      setNewCatalogMed(prev => ({ ...prev, category: trimmed }));
    }
    if (selectedCategoryFilter === oldName) {
      setSelectedCategoryFilter(trimmed);
    }

    // Sync renamed category in medications_catalog collection
    try {
      const affectedMeds = catalogMedications.filter(m => m.category === oldName);
      for (const m of affectedMeds) {
        const docRef = doc(db, 'medications_catalog', m.id);
        await updateDoc(docRef, { category: trimmed });
      }
    } catch (e) {
      console.error("Error updating medications with renamed category:", e);
    }
  }

  async function handleDeleteCategory(index: number) {
    const catToDelete = presets.categories[index];
    if (presets.categories.length <= 1) {
      alert("Debe existir al menos una categoría en el recetario.");
      return;
    }

    const countUsing = catalogMedications.filter(m => m.category === catToDelete).length;
    let confirmMsg = `¿Estás seguro de eliminar la categoría "${catToDelete}"?`;
    if (countUsing > 0) {
      const fallback = presets.categories.find((_, i) => i !== index) || 'Fórmula Magistral';
      confirmMsg += `\n\nHay ${countUsing} medicamento(s) en esta categoría. Se reasignarán automáticamente a "${fallback}".`;
    }

    if (!confirm(confirmMsg)) return;

    const updatedCategories = presets.categories.filter((_, i) => i !== index);
    const fallbackCategory = updatedCategories[0];
    const updated = {
      ...presets,
      categories: updatedCategories
    };
    savePresets(updated);
    if (newCatalogMed.category === catToDelete) {
      setNewCatalogMed(prev => ({ ...prev, category: fallbackCategory }));
    }
    if (selectedCategoryFilter === catToDelete) {
      setSelectedCategoryFilter('all');
    }

    if (countUsing > 0) {
      try {
        const affectedMeds = catalogMedications.filter(m => m.category === catToDelete);
        for (const m of affectedMeds) {
          const docRef = doc(db, 'medications_catalog', m.id);
          await updateDoc(docRef, { category: fallbackCategory });
        }
      } catch (e) {
        console.error("Error updating medications with fallback category:", e);
      }
    }
  }

  // Backup and sync all current data to Cloudflare Workers KV
  async function handleSyncToKv() {
    if (!user) return;
    setIsSyncingKv(true);
    try {
      // 1. Sync doctor profile
      if (doctorProfile) {
        await saveKvDoctorProfile(user.uid, {
          ...doctorProfile,
          customPresets: presets
        });
      }

      // 2. Sync patients
      for (const p of patients) {
        await addKvPatient({ ...p, createdBy: user.uid });
      }

      // 3. Sync prescriptions
      for (const rx of prescriptions) {
        await addKvPrescription({ ...rx, createdBy: user.uid });
      }

      // 4. Sync catalog medications
      for (const m of catalogMedications) {
        await addKvCatalogMed({ ...m, createdBy: user.uid });
      }

      // Check health
      const status = await checkKvHealth();
      setKvStatus(status);

      alert(`¡Sincronización completada con éxito!\n\nSe han respaldado:\n• ${patients.length} pacientes\n• ${prescriptions.length} recetas médicas\n• ${catalogMedications.length} fórmulas/medicamentos\n• Perfil médico y opciones rápidas\n\nEn la base de datos de Cloudflare Workers KV (${status.provider}).`);
    } catch (e: any) {
      console.error("Error syncing to Cloudflare Workers KV:", e);
      alert(`Error al sincronizar con Cloudflare Workers KV: ${e.message}`);
    } finally {
      setIsSyncingKv(false);
    }
  }



  // Local login for karolt and karol1234
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    
    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser || !password) {
      setAuthError('Por favor introduce tu usuario y contraseña');
      return;
    }

    if (cleanUser !== 'karolt' || password !== 'karol1234') {
      setAuthError('Usuario o contraseña incorrectos. Por favor, usa el usuario de prueba.');
      return;
    }

    setDemoLoading(true); // Re-use demo loading state for login spinner
    setTimeout(() => {
      localStorage.setItem('rm_user', 'karolt');
      setUser({ uid: 'karolt', displayName: 'Karol' });
      setDemoLoading(false);
      setUsername('');
      setPassword('');
    }, 600);
  }

  // Handle local sign out
  function handleSignOut() {
    localStorage.removeItem('rm_user');
    setUser(null);
  }

  // Save Doctor Profile
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setProfileLoading(true);
    setIsProfileSaveSuccess(false);
    try {
      const docRef = doc(db, 'doctors', user.uid);
      const updatedProfile = {
        ...settingsForm,
        updatedAt: new Date().toISOString()
      };
      await setDoc(docRef, updatedProfile);
      setDoctorProfile(updatedProfile);
      setIsProfileSaveSuccess(true);
      setTimeout(() => setIsProfileSaveSuccess(false), 4000);
    } catch (e: any) {
      console.error("Error saving profile settings:", e);
      alert(`No se pudo guardar la configuración: ${e.message}`);
    } finally {
      setProfileLoading(false);
    }
  }

  // Create Patient
  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!patientForm.name || !patientForm.lastName) {
      alert("El nombre y apellido son obligatorios");
      return;
    }

    try {
      const patientData: Omit<Patient, 'id'> = {
        ...patientForm,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      };
      const docRef = await addDoc(collection(db, 'patients'), patientData);
      setIsPatientModalOpen(false);
      setPatientForm({
        name: '',
        lastName: '',
        dob: '',
        gender: 'Masculino',
        phone: '',
        email: '',
        allergies: '',
        history: ''
      });
      // Auto-select the newly created patient
      setSelectedPatient({ id: docRef.id, ...patientData });

      // Redirect directly to generating a prescription for this patient
      setPrescriptionForm({
        patientId: docRef.id,
        diagnosis: '',
        instructions: '',
        medications: []
      });
      setActiveTab('prescriptions');
      setIsPrescriptionModalOpen(true);
    } catch (error: any) {
      console.error("Error registering patient:", error);
      alert(`Error al registrar paciente: ${error.message}`);
    }
  }

  // Delete Patient
  async function handleDeletePatient(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este paciente? Esto no borrará sus recetas ya emitidas pero sí removerá su ficha de contacto.")) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
      if (selectedPatient?.id === id) {
        setSelectedPatient(null);
      }
    } catch (error: any) {
      alert(`Error al eliminar paciente: ${error.message}`);
    }
  }

  // Add Medication item to prescription builder
  function addMedicationItem() {
    if (!medForm.genericName && !medForm.commercialName) {
      alert("Por favor ingrese al menos el nombre genérico o comercial del medicamento");
      return;
    }

    const generatedPreview = formatStructuredIndication({
      baseInstruction: medForm.baseInstruction,
      route: medForm.route,
      frequency: medForm.frequency,
      applicationSite: medForm.applicationSite,
      treatmentPeriod: medForm.treatmentPeriod
    });

    let displayName = '';
    if (medForm.commercialName && medForm.genericName) {
      displayName = `${medForm.commercialName} (${medForm.genericName})`;
    } else {
      displayName = medForm.commercialName || medForm.genericName;
    }

    const doseParts: string[] = [];
    if (medForm.concentration) doseParts.push(medForm.concentration);
    if (medForm.pharmaceuticalForm) doseParts.push(medForm.pharmaceuticalForm);
    if (medForm.quantity) doseParts.push(`Cant: ${medForm.quantity}`);
    const displayDose = doseParts.join(' • ');

    const itemToAdd: MedicationItem = {
      genericName: medForm.genericName,
      commercialName: medForm.commercialName,
      concentration: medForm.concentration,
      pharmaceuticalForm: medForm.pharmaceuticalForm,
      quantity: medForm.quantity,
      baseInstruction: medForm.baseInstruction,
      route: medForm.route,
      frequency: medForm.frequency,
      applicationSite: medForm.applicationSite,
      treatmentPeriod: medForm.treatmentPeriod,
      fullIndication: generatedPreview,

      name: displayName,
      dose: displayDose,
      duration: medForm.treatmentPeriod,
      notes: medForm.customNotes || generatedPreview
    };

    setPrescriptionForm(prev => ({
      ...prev,
      medications: [...prev.medications, itemToAdd]
    }));

    setMedForm({
      genericName: '',
      commercialName: '',
      concentration: '',
      pharmaceuticalForm: 'Crema',
      quantity: '1 tubo',
      baseInstruction: 'Capa fina sobre las lesiones',
      route: 'Tópica',
      frequency: '2 veces al día',
      applicationSite: 'Lesiones de brazo',
      treatmentPeriod: '3 semanas',
      customNotes: ''
    });
  }

  // Remove Medication item from builder
  function removeMedicationItem(index: number) {
    setPrescriptionForm(prev => ({
      ...prev,
      medications: prev.medications.filter((_, idx) => idx !== index)
    }));
  }

  // Create Prescription
  async function handleCreatePrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!prescriptionForm.patientId) {
      alert("Seleccione un paciente de la lista");
      return;
    }
    if (!prescriptionForm.diagnosis) {
      alert("Escriba el diagnóstico de la consulta");
      return;
    }
    if (prescriptionForm.medications.length === 0) {
      alert("Debe agregar al menos un medicamento a la receta");
      return;
    }

    const patientObj = patients.find(p => p.id === prescriptionForm.patientId);
    if (!patientObj) return;

    try {
      const prescriptionData: Omit<Prescription, 'id'> = {
        patientId: prescriptionForm.patientId,
        patientName: `${patientObj.name} ${patientObj.lastName}`,
        diagnosis: prescriptionForm.diagnosis,
        instructions: prescriptionForm.instructions,
        medications: JSON.stringify(prescriptionForm.medications),
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        doctorName: doctorProfile?.name || 'Médico',
        doctorLicense: doctorProfile?.licenseId || '',
        clinicName: doctorProfile?.clinicName || ''
      };

      const docRef = await addDoc(collection(db, 'prescriptions'), prescriptionData);
      setIsPrescriptionModalOpen(false);
      // Reset form
      setPrescriptionForm({
        patientId: '',
        diagnosis: '',
        instructions: '',
        medications: []
      });
      // Show details
      setSelectedPrescription({ id: docRef.id, ...prescriptionData });
      setActiveTab('prescriptions');
    } catch (error: any) {
      console.error("Error creating prescription:", error);
      alert(`Error al crear la receta: ${error.message}`);
    }
  }

  // Delete Prescription
  async function handleDeletePrescription(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta receta permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'prescriptions', id));
      if (selectedPrescription?.id === id) {
        setSelectedPrescription(null);
      }
    } catch (error: any) {
      alert(`Error al eliminar receta: ${error.message}`);
    }
  }

  // Create or Update Catalog Medication
  async function handleCreateCatalogMedication(e: React.FormEvent) {
    e.preventDefault();
    const effectiveUserId = user?.uid || 'karolt';
    if (!newCatalogMed.genericName && !newCatalogMed.commercialName) {
      alert("El nombre genérico o comercial del medicamento es obligatorio");
      return;
    }

    const generatedPreview = formatStructuredIndication({
      baseInstruction: newCatalogMed.baseInstruction,
      route: newCatalogMed.route,
      frequency: newCatalogMed.frequency,
      applicationSite: newCatalogMed.applicationSite,
      treatmentPeriod: newCatalogMed.treatmentPeriod
    });

    let displayName = '';
    if (newCatalogMed.commercialName && newCatalogMed.genericName) {
      displayName = `${newCatalogMed.commercialName} (${newCatalogMed.genericName})`;
    } else {
      displayName = newCatalogMed.commercialName || newCatalogMed.genericName;
    }

    const doseParts: string[] = [];
    if (newCatalogMed.concentration) doseParts.push(newCatalogMed.concentration);
    if (newCatalogMed.pharmaceuticalForm) doseParts.push(newCatalogMed.pharmaceuticalForm);
    if (newCatalogMed.quantity) doseParts.push(`Cant: ${newCatalogMed.quantity}`);
    const displayDose = doseParts.join(' • ');

    const docId = editingCatalogMedId || `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const medData: CatalogMedication = {
      id: docId,
      category: newCatalogMed.category,
      genericName: newCatalogMed.genericName,
      commercialName: newCatalogMed.commercialName,
      concentration: newCatalogMed.concentration,
      pharmaceuticalForm: newCatalogMed.pharmaceuticalForm,
      quantity: newCatalogMed.quantity,
      baseInstruction: newCatalogMed.baseInstruction,
      route: newCatalogMed.route,
      frequency: newCatalogMed.frequency,
      applicationSite: newCatalogMed.applicationSite,
      treatmentPeriod: newCatalogMed.treatmentPeriod,
      fullIndication: generatedPreview,

      name: displayName,
      dose: displayDose,
      duration: newCatalogMed.treatmentPeriod,
      notes: newCatalogMed.customNotes || generatedPreview,
      createdAt: new Date().toISOString(),
      createdBy: effectiveUserId
    };

    // 1. Optimistic & Local Storage update immediately
    setCatalogMedications(prev => {
      let updated: CatalogMedication[];
      if (editingCatalogMedId) {
        updated = prev.map(m => m.id === editingCatalogMedId ? medData : m);
      } else {
        updated = [medData, ...prev.filter(m => m.id !== docId)];
      }
      localStorage.setItem('rm_catalog_medications', JSON.stringify(updated));
      return updated;
    });

    setCatalogSaveSuccess(true);
    setTimeout(() => setCatalogSaveSuccess(false), 4000);

    // 2. Reset form
    const wasEditing = Boolean(editingCatalogMedId);
    setEditingCatalogMedId(null);
    setNewCatalogMed({
      category: 'Fórmula Magistral',
      genericName: '',
      commercialName: '',
      concentration: '',
      pharmaceuticalForm: 'Crema',
      quantity: '1 tubo',
      baseInstruction: 'Capa fina sobre las lesiones',
      route: 'Tópica',
      frequency: '2 veces al día',
      applicationSite: 'Lesiones de brazo',
      treatmentPeriod: '3 semanas',
      customNotes: ''
    });

    // 3. Asynchronously sync to Cloudflare Workers KV and Firestore
    try {
      if (wasEditing) {
        updateKvCatalogMed(docId, medData, effectiveUserId).catch(console.warn);
      } else {
        addKvCatalogMed(medData).catch(console.warn);
      }
    } catch (e) {
      console.warn("KV sync note:", e);
    }

    try {
      const docRef = doc(db, 'medications_catalog', docId);
      setDoc(docRef, medData, { merge: true }).catch(console.warn);
    } catch (e) {
      console.warn("Firestore sync note:", e);
    }
  }

  function handleEditCatalogMedication(med: CatalogMedication) {
    setEditingCatalogMedId(med.id);
    setNewCatalogMed({
      category: med.category || 'Fórmula Magistral',
      genericName: med.genericName || med.name || '',
      commercialName: med.commercialName || '',
      concentration: med.concentration || med.dose || '',
      pharmaceuticalForm: med.pharmaceuticalForm || 'Crema',
      quantity: med.quantity || '1 tubo',
      baseInstruction: med.baseInstruction || 'Capa fina sobre las lesiones',
      route: med.route || 'Tópica',
      frequency: med.frequency || '2 veces al día',
      applicationSite: med.applicationSite || 'Lesiones de brazo',
      treatmentPeriod: med.treatmentPeriod || med.duration || '3 semanas',
      customNotes: med.customNotes || (med.notes !== med.fullIndication ? med.notes : '') || ''
    });
    // Scroll smoothly to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelCatalogEdit() {
    setEditingCatalogMedId(null);
    setNewCatalogMed({
      category: 'Fórmula Magistral',
      genericName: '',
      commercialName: '',
      concentration: '',
      pharmaceuticalForm: 'Crema',
      quantity: '1 tubo',
      baseInstruction: 'Capa fina sobre las lesiones',
      route: 'Tópica',
      frequency: '2 veces al día',
      applicationSite: 'Lesiones de brazo',
      treatmentPeriod: '3 semanas',
      customNotes: ''
    });
  }

  // Delete Catalog Medication
  async function handleDeleteCatalogMedication(id: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta fórmula del catálogo?")) return;
    const effectiveUserId = user?.uid || 'karolt';
    
    // 1. Optimistic & Local Storage update immediately
    setCatalogMedications(prev => {
      const updated = prev.filter(m => m.id !== id);
      localStorage.setItem('rm_catalog_medications', JSON.stringify(updated));
      return updated;
    });

    if (editingCatalogMedId === id) {
      handleCancelCatalogEdit();
    }

    // 2. Async backend deletion
    try {
      deleteKvCatalogMed(id, effectiveUserId).catch(console.warn);
    } catch (e) {}

    try {
      deleteDoc(doc(db, 'medications_catalog', id)).catch(console.warn);
    } catch (e) {}
  }

  // Save directly from the prescription constructor into the permanent catalog
  function handleSaveCurrentBuilderToCatalog() {
    if (!medForm.genericName && !medForm.commercialName) {
      alert("Por favor ingrese al menos el nombre genérico o comercial del medicamento para guardarlo en el catálogo");
      return;
    }

    const effectiveUserId = user?.uid || 'karolt';
    const generatedPreview = formatStructuredIndication({
      baseInstruction: medForm.baseInstruction,
      route: medForm.route,
      frequency: medForm.frequency,
      applicationSite: medForm.applicationSite,
      treatmentPeriod: medForm.treatmentPeriod
    });

    let displayName = '';
    if (medForm.commercialName && medForm.genericName) {
      displayName = `${medForm.commercialName} (${medForm.genericName})`;
    } else {
      displayName = medForm.commercialName || medForm.genericName;
    }

    const doseParts: string[] = [];
    if (medForm.concentration) doseParts.push(medForm.concentration);
    if (medForm.pharmaceuticalForm) doseParts.push(medForm.pharmaceuticalForm);
    if (medForm.quantity) doseParts.push(`Cant: ${medForm.quantity}`);
    const displayDose = doseParts.join(' • ');

    const newId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const medData: CatalogMedication = {
      id: newId,
      category: 'Fórmula Magistral',
      genericName: medForm.genericName,
      commercialName: medForm.commercialName,
      concentration: medForm.concentration,
      pharmaceuticalForm: medForm.pharmaceuticalForm,
      quantity: medForm.quantity,
      baseInstruction: medForm.baseInstruction,
      route: medForm.route,
      frequency: medForm.frequency,
      applicationSite: medForm.applicationSite,
      treatmentPeriod: medForm.treatmentPeriod,
      fullIndication: generatedPreview,

      name: displayName,
      dose: displayDose,
      duration: medForm.treatmentPeriod,
      notes: medForm.customNotes || generatedPreview,
      createdAt: new Date().toISOString(),
      createdBy: effectiveUserId
    };

    setCatalogMedications(prev => {
      const updated = [medData, ...prev];
      localStorage.setItem('rm_catalog_medications', JSON.stringify(updated));
      return updated;
    });

    try {
      addKvCatalogMed(medData).catch(console.warn);
      setDoc(doc(db, 'medications_catalog', newId), medData).catch(console.warn);
    } catch (e) {}

    alert(`¡"${displayName}" se ha guardado exitosamente en tu Catálogo de Fórmulas y Medicamentos!`);
  }



  // Browser Print handler
  const handlePrint = () => {
    window.print();
  };

  // Direct High-Resolution PDF Download
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current || !selectedPrescription) return;
    setIsDownloadingPdf(true);
    try {
      const element = printAreaRef.current;

      // Exact A4 dimensions: 210mm x 297mm
      // Standard 150 PPI pixel resolution for A4:
      // Width  = (210 mm / 25.4) * 150 = 1240.15 px -> 1240 px
      // Height = (297 mm / 25.4) * 150 = 1753.94 px -> 1754 px
      const TARGET_WIDTH = 1240;
      const TARGET_HEIGHT = 1754;

      // Base desktop reference width: 800px
      // Height to maintain exact A4 ratio: 800 * (1754 / 1240) = 1131.6px (~1132px)
      // Scale factor: 1240 / 800 = 1.55x -> produces exactly 1240x1754 at 150 PPI
      const BASE_WIDTH = 800;
      const BASE_HEIGHT = 1132;
      const SCALE_FACTOR = TARGET_WIDTH / BASE_WIDTH; // 1.55

      let imgData = '';
      try {
        // Method 1: html-to-image (Uses native SVG foreignObject, preserves all Tailwind CSS in production without stylesheet CORS issues)
        imgData = await toJpeg(element, {
          quality: 0.96,
          backgroundColor: '#ffffff',
          canvasWidth: TARGET_WIDTH,
          canvasHeight: TARGET_HEIGHT,
          pixelRatio: 1,
          skipFonts: true,
          style: {
            width: `${BASE_WIDTH}px`,
            minWidth: `${BASE_WIDTH}px`,
            maxWidth: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            minHeight: `${BASE_HEIGHT}px`,
            maxHeight: `${BASE_HEIGHT}px`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '36px 44px 0px 44px',
            margin: '0',
            borderRadius: '0px',
            border: 'none',
            boxShadow: 'none',
            backgroundColor: '#ffffff'
          }
        });
      } catch (h2iErr) {
        console.warn('html-to-image failed, falling back to html2canvas-pro with stylesheet injection:', h2iErr);
        const canvas = await html2canvas(element, {
          scale: SCALE_FACTOR,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 1024,
          onclone: (clonedDoc) => {
            // Copy CSS rules directly into an inline <style> tag so clonedDoc doesnt fail fetching external CSS
            try {
              const styleEl = clonedDoc.createElement('style');
              let allCss = '';
              Array.from(document.styleSheets).forEach(sheet => {
                try {
                  Array.from(sheet.cssRules || []).forEach(rule => {
                    allCss += rule.cssText + '\n';
                  });
                } catch (e) {}
              });
              styleEl.textContent = allCss;
              clonedDoc.head.appendChild(styleEl);
            } catch (e) {}

            const clonedElement = clonedDoc.getElementById('printable-prescription');
            if (clonedElement) {
              clonedElement.style.width = `${BASE_WIDTH}px`;
              clonedElement.style.minWidth = `${BASE_WIDTH}px`;
              clonedElement.style.maxWidth = `${BASE_WIDTH}px`;
              clonedElement.style.height = `${BASE_HEIGHT}px`;
              clonedElement.style.minHeight = `${BASE_HEIGHT}px`;
              clonedElement.style.maxHeight = `${BASE_HEIGHT}px`;
              clonedElement.style.display = 'flex';
              clonedElement.style.flexDirection = 'column';
              clonedElement.style.justifyContent = 'space-between';
              clonedElement.style.padding = '36px 44px 0px 44px';
              clonedElement.style.boxShadow = 'none';
              clonedElement.style.border = 'none';
              clonedElement.style.borderRadius = '0';
              clonedElement.style.backgroundColor = '#ffffff';

              // Ensure bottom segment sits at the absolute bottom
              const bottomSegment = clonedElement.querySelector('.mt-auto') || clonedElement.lastElementChild;
              if (bottomSegment instanceof HTMLElement) {
                bottomSegment.style.marginTop = 'auto';
              }

              // Make the social footer banner sit flush against the bottom edge of the A4 page
              const footerBanner = clonedElement.querySelector('.bg-\\[\\#cc8576\\]') as HTMLElement | null;
              if (footerBanner) {
                footerBanner.style.marginLeft = '-44px';
                footerBanner.style.marginRight = '-44px';
                footerBanner.style.marginBottom = '0px';
                footerBanner.style.borderRadius = '0px';
                footerBanner.style.paddingTop = '10px';
                footerBanner.style.paddingBottom = '10px';
              }
            }
          }
        });
        imgData = canvas.toDataURL('image/jpeg', 0.96);
      }

      // Create PDF in A4 format (210mm x 297mm)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Render full bleed across the A4 sheet: width 210mm, height 297mm
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      const patientSlug = (selectedPrescription.patientName || 'Paciente')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      const dateSlug = (selectedPrescription.createdAt || new Date().toISOString()).split('T')[0];
      const filename = `Receta_${patientSlug}_${dateSlug}.pdf`;

      // Dual-strategy download for desktop & mobile browsers
      try {
        pdf.save(filename);
      } catch (saveErr) {
        console.warn('pdf.save failed, using direct anchor fallback:', saveErr);
        const blob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 4000);
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      window.print();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Computed: stats for dashboard
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const registeredToday = patients.filter(p => p.createdAt && p.createdAt.startsWith(today)).length;
    const prescriptionsToday = prescriptions.filter(p => p.createdAt && p.createdAt.startsWith(today)).length;
    
    // Count different patient allergies
    let criticalAllergiesCount = patients.filter(p => p.allergies && p.allergies.trim().toLowerCase() !== 'ninguna' && p.allergies.trim().toLowerCase() !== 'ninguno' && p.allergies.trim() !== '').length;

    return {
      totalPatients: patients.length,
      totalPrescriptions: prescriptions.length,
      registeredToday,
      prescriptionsToday,
      criticalAllergiesCount
    };
  }, [patients, prescriptions]);

  // Filters
  const allAvailablePatients = useMemo(() => {
    const list = [...patients];
    if (prescriptionForm.patientId && !list.some(p => p.id === prescriptionForm.patientId)) {
      if (selectedPatient && selectedPatient.id === prescriptionForm.patientId) {
        list.unshift(selectedPatient);
      }
    }
    return list;
  }, [patients, prescriptionForm.patientId, selectedPatient]);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const search = patientSearch.toLowerCase();
      const fullName = `${p.name} ${p.lastName}`.toLowerCase();
      return fullName.includes(search) || (p.phone && p.phone.includes(search)) || (p.email && p.email.toLowerCase().includes(search));
    });
  }, [patients, patientSearch]);

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      const search = prescriptionSearch.toLowerCase();
      return p.patientName.toLowerCase().includes(search) || p.diagnosis.toLowerCase().includes(search);
    });
  }, [prescriptions, prescriptionSearch]);

  const filteredCatalogMedications = useMemo(() => {
    return catalogMedications.filter(m => {
      const search = catalogSearch.toLowerCase();
      const matchesSearch = 
        m.name.toLowerCase().includes(search) || 
        m.category.toLowerCase().includes(search) || 
        (m.genericName && m.genericName.toLowerCase().includes(search)) ||
        (m.commercialName && m.commercialName.toLowerCase().includes(search)) ||
        (m.notes && m.notes.toLowerCase().includes(search));

      const matchesCategory = selectedCategoryFilter === 'all' || m.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [catalogMedications, catalogSearch, selectedCategoryFilter]);

  // Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Stethoscope className="h-12 w-12 text-teal-600 animate-pulse" />
          <p className="text-slate-600 font-medium">Iniciando plataforma médica en tiempo real...</p>
          <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-teal-500 animate-infinite-scroll w-8 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Auth Screen (Login with specific doctor credentials)
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-linen to-[#f3efea] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-brand-border overflow-hidden">
          <div className="p-8 text-center border-b border-brand-border bg-brand-linen/40">
            <div className="inline-flex p-3 bg-brand-linen border border-brand-border rounded-2xl mb-4 shadow-sm">
              <IsotypeLogo className="h-14 w-14" />
            </div>
            <h1 className="text-2xl font-bold text-brand-charcoal">Recetas Dermatológicas</h1>
          </div>

          <div className="p-8">
            <form onSubmit={handleAuth} className="space-y-4">
              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Nombre de Usuario</label>
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Introduce 'karolt'"
                  className="w-full px-4 py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose transition-all placeholder:text-slate-400 bg-brand-linen/10"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Contraseña</label>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce 'karol1234'"
                  className="w-full px-4 py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose transition-all placeholder:text-slate-400 bg-brand-linen/10"
                />
              </div>

              <button 
                type="submit"
                disabled={demoLoading}
                className="w-full py-3 bg-gradient-to-r from-brand-rose to-brand-sand hover:opacity-90 text-white font-semibold rounded-xl shadow-md shadow-brand-rose/10 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
              >
                {demoLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                    <span>Iniciando Sesión...</span>
                  </>
                ) : (
                  <span>Acceder al Consultorio</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard / Layout UI
  return (
    <div className="min-h-screen bg-brand-linen/30 flex flex-col lg:flex-row font-sans text-brand-charcoal">
      
      {/* SIDEBAR FOR LARGER SCREEN, HEADER FOR RESPONSIVE ANDROID VIEW */}
      <header className="lg:hidden bg-white border-b border-brand-border px-4 py-3 flex items-center justify-between no-print shadow-sm">
        <div className="flex items-center gap-2">
          <IsotypeLogo className="h-8 w-8" />
          <div>
            <span className="font-bold text-brand-charcoal text-sm block">RecetaMedica</span>
            <span className="text-[10px] text-brand-rose font-semibold uppercase tracking-wider flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-brand-rose rounded-full animate-ping"></span>
              Sincronizado
            </span>
          </div>
        </div>
        
        {/* Simple navigation bar for mobile */}
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`p-2 rounded-lg transition ${activeTab === 'dashboard' ? 'bg-brand-linen text-brand-rose' : 'text-slate-500'}`}
            title="Dashboard"
          >
            <Activity className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setActiveTab('patients')}
            className={`p-2 rounded-lg transition ${activeTab === 'patients' ? 'bg-brand-linen text-brand-rose' : 'text-slate-500'}`}
            title="Pacientes"
          >
            <Users className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setActiveTab('prescriptions')}
            className={`p-2 rounded-lg transition ${activeTab === 'prescriptions' ? 'bg-brand-linen text-brand-rose' : 'text-slate-500'}`}
            title="Recetas"
          >
            <FileText className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setActiveTab('medications')}
            className={`p-2 rounded-lg transition ${activeTab === 'medications' ? 'bg-brand-linen text-brand-rose' : 'text-slate-500'}`}
            title="Medicamentos y Fórmulas"
          >
            <Pill className="h-5 w-5" />
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`p-2 rounded-lg transition ${activeTab === 'settings' ? 'bg-brand-linen text-brand-rose' : 'text-slate-500'}`}
            title="Ajustes"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button 
            onClick={handleSignOut}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition ml-1"
            title="Salir"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* LEFT SIDEBAR (PC layout) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-brand-border shrink-0 no-print">
        {/* Logo and sync badge */}
        <div className="p-6 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <IsotypeLogo className="h-10 w-10" />
            <div>
              <h2 className="font-extrabold text-brand-charcoal leading-tight">RecetaMedica</h2>
              <p className="text-[10px] text-brand-rose font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 bg-brand-rose rounded-full animate-ping"></span>
                Nube Activa Realtime
              </p>
            </div>
          </div>
        </div>

        {/* Doctor Identity summary */}
        <div className="p-4 mx-4 my-4 bg-brand-linen border border-brand-border rounded-xl flex items-center gap-3">
          <div className="p-2 bg-brand-rose/10 text-brand-rose rounded-lg">
            <User className="h-5 w-5" />
          </div>
          <div className="overflow-hidden">
            <span className="text-xs text-slate-400 block font-semibold uppercase tracking-wider">Médico Conectado</span>
            <span className="font-bold text-brand-charcoal text-sm block truncate" title={doctorProfile?.name}>{doctorProfile?.name || 'Cargando...'}</span>
          </div>
        </div>

        {/* Sidebar Tabs */}
        <nav className="flex-1 px-4 space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition cursor-pointer ${activeTab === 'dashboard' ? 'bg-brand-rose/10 text-brand-rose' : 'text-slate-600 hover:bg-brand-linen/60'}`}
          >
            <Activity className="h-5 w-5 shrink-0" />
            <span>Dashboard</span>
          </button>

          <button 
            onClick={() => setActiveTab('patients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition cursor-pointer ${activeTab === 'patients' ? 'bg-brand-rose/10 text-brand-rose' : 'text-slate-600 hover:bg-brand-linen/60'}`}
          >
            <Users className="h-5 w-5 shrink-0" />
            <span>Pacientes</span>
            {patients.length > 0 && (
              <span className="ml-auto bg-brand-linen text-brand-rose text-xs px-2 py-0.5 rounded-md font-bold border border-brand-border">
                {patients.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('medications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition cursor-pointer ${activeTab === 'medications' ? 'bg-brand-rose/10 text-brand-rose' : 'text-slate-600 hover:bg-brand-linen/60'}`}
          >
            <Pill className="h-5 w-5 shrink-0" />
            <span>Fórmulas y Medicamentos</span>
            {catalogMedications.length > 0 && (
              <span className="ml-auto bg-brand-linen text-brand-rose text-xs px-2 py-0.5 rounded-md font-bold border border-brand-border">
                {catalogMedications.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('prescriptions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition cursor-pointer ${activeTab === 'prescriptions' ? 'bg-brand-rose/10 text-brand-rose' : 'text-slate-600 hover:bg-brand-linen/60'}`}
          >
            <FileText className="h-5 w-5 shrink-0" />
            <span>Recetas Emitidas</span>
            {prescriptions.length > 0 && (
              <span className="ml-auto bg-brand-linen text-brand-rose text-xs px-2 py-0.5 rounded-md font-bold border border-brand-border">
                {prescriptions.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition cursor-pointer ${activeTab === 'settings' ? 'bg-brand-rose/10 text-brand-rose' : 'text-slate-600 hover:bg-brand-linen/60'}`}
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span>Configurar Consultorio</span>
          </button>
        </nav>

        {/* Devices status summary and Logout */}
        <div className="p-4 border-t border-brand-border">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-medium transition cursor-pointer"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 lg:p-8 space-y-6">

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-brand-charcoal tracking-tight">Bienvenido, Dr. {doctorProfile?.name || 'Médico'}</h1>
                  <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Actividad sincronizada de tu recetario dermatológico.</p>
                </div>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsPatientModalOpen(true)}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-white border border-brand-border hover:bg-brand-linen/50 text-brand-charcoal font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                  >
                    <UserPlus className="h-4 w-4 text-brand-sand shrink-0" />
                    <span className="truncate">Nuevo Paciente</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (patients.length === 0) {
                        alert("Primero debe registrar al menos un paciente para poder crear una receta.");
                        setIsPatientModalOpen(true);
                      } else {
                        setIsPrescriptionModalOpen(true);
                      }
                    }}
                    className="px-3 py-2 sm:px-4 sm:py-2 bg-brand-rose hover:bg-brand-rose/90 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-brand-rose/10"
                  >
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">Generar Receta</span>
                  </button>
                </div>
              </div>

              {/* STAT CARDS (Compact 2x2 grid on mobile, 4 columns on large screens) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-brand-border shadow-2xs sm:shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">Pacientes</span>
                    <span className="text-lg sm:text-2xl font-black text-brand-charcoal block mt-0.5">{stats.totalPatients}</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-brand-rose/10 text-brand-rose rounded-lg sm:rounded-xl shrink-0">
                    <Users className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-brand-border shadow-2xs sm:shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">Recetas</span>
                    <span className="text-lg sm:text-2xl font-black text-brand-charcoal block mt-0.5">{stats.totalPrescriptions}</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-brand-sand/10 text-brand-sand rounded-lg sm:rounded-xl shrink-0">
                    <FileText className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-brand-border shadow-2xs sm:shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">Nuevos Hoy</span>
                    <span className="text-lg sm:text-2xl font-black text-emerald-600 block mt-0.5">+{stats.registeredToday}</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-emerald-50 text-emerald-600 rounded-lg sm:rounded-xl shrink-0">
                    <UserPlus className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
                  </div>
                </div>

                <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-brand-border shadow-2xs sm:shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider block truncate">Con Alergias</span>
                    <span className="text-lg sm:text-2xl font-black text-amber-600 block mt-0.5">{stats.criticalAllergiesCount}</span>
                  </div>
                  <div className="p-2 sm:p-3 bg-amber-50 text-amber-600 rounded-lg sm:rounded-xl shrink-0">
                    <AlertCircle className="h-4.5 w-4.5 sm:h-6 sm:w-6" />
                  </div>
                </div>
              </div>

              {/* SPLIT LAYOUT FOR RECENT ITEMS */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                
                {/* Real-time Patients list snapshot */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-brand-border shadow-2xs sm:shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-border pb-3">
                    <div>
                      <h3 className="font-bold text-brand-charcoal text-sm sm:text-lg">Pacientes Recientes</h3>
                      <p className="text-[11px] sm:text-xs text-slate-400">Sincronización instantánea</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('patients')}
                      className="text-[11px] sm:text-xs font-bold text-brand-rose hover:text-brand-rose/90 flex items-center gap-1 transition cursor-pointer"
                    >
                      Ver Todos
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-brand-border max-h-72 sm:max-h-80 overflow-y-auto space-y-2 sm:space-y-3 pr-1">
                    {patients.length === 0 ? (
                      <div className="text-center py-8 sm:py-12 text-slate-400 space-y-2">
                        <Users className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-slate-300" />
                        <p className="text-xs sm:text-sm">No hay pacientes registrados aún.</p>
                      </div>
                    ) : (
                      patients.slice(0, 5).map((patient) => (
                        <div 
                          key={patient.id} 
                          className="flex items-center justify-between pt-2.5 sm:pt-3 cursor-pointer group"
                          onClick={() => {
                            setSelectedPatient(patient);
                            setActiveTab('patients');
                          }}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-brand-linen text-brand-rose flex items-center justify-center font-bold text-xs sm:text-sm border border-brand-border group-hover:bg-brand-rose group-hover:text-white transition shrink-0">
                              {patient.name[0]}{patient.lastName[0]}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-brand-charcoal text-xs sm:text-sm block group-hover:text-brand-rose transition truncate">{patient.name} {patient.lastName}</span>
                              <span className="text-[11px] sm:text-xs text-slate-500 block truncate">{patient.phone || 'Sin teléfono'} {patient.allergies ? `• Alérgico a: ${patient.allergies}` : ''}</span>
                            </div>
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-slate-400 font-semibold shrink-0 ml-2">{new Date(patient.createdAt).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Real-time Prescriptions list snapshot */}
                <div className="bg-white rounded-xl sm:rounded-2xl border border-brand-border shadow-2xs sm:shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between border-b border-brand-border pb-3">
                    <div>
                      <h3 className="font-bold text-brand-charcoal text-sm sm:text-lg">Últimas Recetas Médicas</h3>
                      <p className="text-[11px] sm:text-xs text-slate-400">Listas para imprimir o compartir</p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('prescriptions')}
                      className="text-[11px] sm:text-xs font-bold text-brand-rose hover:text-brand-rose/90 flex items-center gap-1 transition cursor-pointer"
                    >
                      Ver Todas
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="divide-y divide-brand-border max-h-72 sm:max-h-80 overflow-y-auto space-y-2 sm:space-y-3 pr-1">
                    {prescriptions.length === 0 ? (
                      <div className="text-center py-8 sm:py-12 text-slate-400 space-y-2">
                        <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-slate-300" />
                        <p className="text-xs sm:text-sm">No se han emitido recetas médicas.</p>
                      </div>
                    ) : (
                      prescriptions.slice(0, 5).map((recipe) => (
                        <div 
                          key={recipe.id} 
                          className="flex items-center justify-between pt-2.5 sm:pt-3 cursor-pointer group"
                          onClick={() => {
                            setSelectedPrescription(recipe);
                            setActiveTab('prescriptions');
                          }}
                        >
                          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                            <div className="p-2 sm:p-2.5 bg-brand-linen text-brand-rose rounded-lg sm:rounded-xl group-hover:bg-brand-rose group-hover:text-white transition shrink-0">
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-brand-charcoal text-xs sm:text-sm block group-hover:text-brand-rose transition truncate">{recipe.patientName}</span>
                              <span className="text-[11px] sm:text-xs text-slate-500 block truncate">Dgo: {recipe.diagnosis}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-semibold">{new Date(recipe.createdAt).toLocaleDateString()}</span>
                            <span className="text-[11px] sm:text-xs text-brand-rose font-bold flex items-center justify-end gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition">
                              <Printer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                              Ver
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: PATIENTS */}
          {activeTab === 'patients' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left col: search & list */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">Fichas de Pacientes</h2>
                  <button 
                    onClick={() => setIsPatientModalOpen(true)}
                    className="p-2 bg-brand-linen hover:bg-brand-rose/10 text-brand-rose border border-brand-border rounded-xl transition cursor-pointer"
                    title="Registrar Nuevo Paciente"
                  >
                    <UserPlus className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Buscar por nombre..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition"
                  />
                </div>

                <div className="bg-white rounded-2xl border border-brand-border shadow-sm divide-y divide-brand-border max-h-[60vh] overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm">Ningún paciente coincide con la búsqueda.</p>
                    </div>
                  ) : (
                    filteredPatients.map((patient) => (
                      <div 
                        key={patient.id}
                        onClick={() => setSelectedPatient(patient)}
                        className={`p-4 flex items-center justify-between cursor-pointer transition ${selectedPatient?.id === patient.id ? 'bg-brand-linen border-l-4 border-brand-rose' : 'hover:bg-brand-linen/40'}`}
                      >
                        <div>
                          <span className="font-bold text-brand-charcoal text-sm block">{patient.name} {patient.lastName}</span>
                          <span className="text-xs text-slate-500 block">
                            {patient.dob ? `${calculateAge(patient.dob).replace(' (Edad: ', '').replace(')', '')} • ` : ''}{patient.gender}
                          </span>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition ${selectedPatient?.id === patient.id ? 'transform translate-x-1 text-brand-rose' : ''}`} />
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right cols: detail view */}
              <div className="lg:col-span-2 space-y-6">
                {selectedPatient ? (
                  <div className="bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
                    <div className="p-6 bg-brand-linen/20 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-brand-linen text-brand-rose font-extrabold flex items-center justify-center text-lg border border-brand-border">
                          {selectedPatient.name[0]}{selectedPatient.lastName[0]}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-brand-charcoal leading-tight">{selectedPatient.name} {selectedPatient.lastName}</h2>
                          <p className="text-xs text-slate-500">Registrado el {new Date(selectedPatient.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setPrescriptionForm({
                              patientId: selectedPatient.id,
                              diagnosis: '',
                              instructions: '',
                              medications: []
                            });
                            setIsPrescriptionModalOpen(true);
                          }}
                          className="px-4 py-2 bg-brand-rose hover:bg-brand-rose/90 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Nueva Receta</span>
                        </button>
                        <button 
                          onClick={() => handleDeletePatient(selectedPatient.id)}
                          className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition cursor-pointer"
                          title="Eliminar Paciente"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Personal data */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Información Personal</h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 text-slate-600">
                            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="text-sm"><strong className="text-slate-800 font-medium">Nacimiento:</strong> {selectedPatient.dob ? new Date(selectedPatient.dob + 'T00:00:00').toLocaleDateString() : 'No especificado'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-600">
                            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="text-sm"><strong className="text-slate-800 font-medium">Edad:</strong> {selectedPatient.dob ? calculateAge(selectedPatient.dob).replace(' (Edad: ', '').replace(')', '') : 'No especificada'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-600">
                            <User className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="text-sm"><strong className="text-slate-800 font-medium">Género:</strong> {selectedPatient.gender}</span>
                          </div>
                        </div>
                      </div>

                      {/* Medical warnings */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Alergias e Historial Clínico</h4>
                        <div className="space-y-3">
                          <div className="p-3 bg-amber-50 border border-amber-200/50 rounded-xl text-amber-900 text-sm">
                            <strong className="block text-amber-800 font-semibold mb-0.5">Alergias:</strong>
                            {selectedPatient.allergies ? selectedPatient.allergies : 'Ninguna declarada.'}
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-slate-700 text-xs">
                            <strong className="block text-slate-800 font-bold mb-0.5 uppercase tracking-wider text-[10px]">Antecedentes Clínicos:</strong>
                            {selectedPatient.history ? selectedPatient.history : 'Sin antecedentes descriptos.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Prescription list associated to patient */}
                    <div className="border-t border-slate-100 p-6 space-y-4 bg-slate-50/30">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Historial de Recetas Emitidas</h4>
                      {prescriptions.filter(p => p.patientId === selectedPatient.id).length === 0 ? (
                        <p className="text-slate-400 text-sm text-center py-6">Este paciente no tiene recetas generadas aún.</p>
                      ) : (
                        <div className="space-y-2">
                          {prescriptions
                            .filter(p => p.patientId === selectedPatient.id)
                            .map(recipe => (
                              <div 
                                key={recipe.id}
                                onClick={() => {
                                  setSelectedPrescription(recipe);
                                  setActiveTab('prescriptions');
                                }}
                                className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:border-teal-500 hover:shadow-md transition"
                              >
                                <div>
                                  <span className="font-bold text-slate-800 text-sm block">Diag: {recipe.diagnosis}</span>
                                  <span className="text-xs text-slate-500 block">Médico: {recipe.doctorName} • Cédula: {recipe.doctorLicense}</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-400">
                                  <span className="text-xs">{new Date(recipe.createdAt).toLocaleDateString()}</span>
                                  <Printer className="h-4 w-4 hover:text-teal-600" />
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 space-y-3 flex flex-col items-center justify-center h-80">
                    <Users className="h-12 w-12 text-slate-300" />
                    <div>
                      <p className="font-bold text-slate-700 text-base">Seleccione un paciente</p>
                      <p className="text-sm">Haga clic en la lista de la izquierda para ver su historial médico y emitir recetas.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: PRESCRIPTIONS */}
          {activeTab === 'prescriptions' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left column: search & list */}
              <div className="lg:col-span-1 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-800">Recetas Guardadas</h2>
                  <button 
                    onClick={() => {
                      if (patients.length === 0) {
                        alert("Debe registrar al menos un paciente para poder generar una receta.");
                        setIsPatientModalOpen(true);
                      } else {
                        setIsPrescriptionModalOpen(true);
                      }
                    }}
                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition cursor-pointer"
                    title="Emitir Nueva Receta"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input 
                    type="text"
                    value={prescriptionSearch}
                    onChange={(e) => setPrescriptionSearch(e.target.value)}
                    placeholder="Buscar por paciente o diagnóstico..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition"
                  />
                </div>

                <div className="bg-white rounded-2xl border border-brand-border shadow-sm divide-y divide-brand-border max-h-[60vh] overflow-y-auto">
                  {filteredPrescriptions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">
                      <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                      <p className="text-sm">Ninguna receta médica encontrada.</p>
                    </div>
                  ) : (
                    filteredPrescriptions.map((recipe) => (
                      <div 
                        key={recipe.id}
                        onClick={() => setSelectedPrescription(recipe)}
                        className={`p-4 cursor-pointer transition ${selectedPrescription?.id === recipe.id ? 'bg-brand-linen border-l-4 border-brand-rose' : 'hover:bg-brand-linen/40'}`}
                      >
                        <span className="font-bold text-brand-charcoal text-sm block truncate">{recipe.patientName}</span>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-slate-500 block truncate max-w-[150px]">Diag: {recipe.diagnosis}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{new Date(recipe.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right columns: layout details, and printable card representation */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                {selectedPrescription ? (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Actions control bar */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-brand-border shadow-sm flex items-center justify-between no-print gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm text-slate-500 font-medium">Receta #{selectedPrescription.id.slice(-6).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button 
                          onClick={handleDownloadPdf}
                          disabled={isDownloadingPdf}
                          className="px-3.5 py-2 sm:px-4 sm:py-2 bg-brand-rose hover:bg-brand-rose/90 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
                          title="Descargar receta directamente como archivo PDF"
                        >
                          {isDownloadingPdf ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                          <span>{isDownloadingPdf ? 'Generando PDF...' : 'Descargar PDF'}</span>
                        </button>
                        <button 
                          onClick={handlePrint}
                          className="px-3.5 py-2 sm:px-4 sm:py-2 bg-brand-charcoal hover:opacity-90 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 sm:gap-2 transition cursor-pointer shadow-sm"
                          title="Imprimir receta médica"
                        >
                          <Printer className="h-4 w-4" />
                          <span>Imprimir</span>
                        </button>
                        <button 
                          onClick={() => handleDeletePrescription(selectedPrescription.id)}
                          className="p-2 border border-red-100 hover:bg-red-50 text-red-500 rounded-xl transition cursor-pointer"
                          title="Eliminar Receta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Mobile helper hint */}
                    <div className="sm:hidden flex items-center justify-between text-[11px] text-slate-500 bg-brand-linen/60 px-3 py-1.5 rounded-xl border border-brand-border/80">
                      <span className="font-medium text-brand-charcoal flex items-center gap-1">
                        <span>📄</span> Hoja de Receta Médica
                      </span>
                      <span className="text-brand-rose font-bold text-[10.5px]">Desliza a los lados ⇄</span>
                    </div>

                    {/* HORIZONTAL WRAPPER TO PREVENT NARROW SQUISHING ON PHONES */}
                    <div className="w-full overflow-x-auto pb-4 pt-0.5 rounded-2xl border border-brand-border/40 sm:border-0 bg-brand-linen/10 sm:bg-transparent">
                      {/* MEDICAL PRESCRIPTION SHEET (PERFECT RENDER FOR THE DOCTOR) */}
                      <div 
                        ref={printAreaRef}
                        className="bg-white rounded-2xl border border-brand-border shadow-lg p-6 sm:p-8 md:p-12 space-y-6 relative overflow-hidden flex flex-col justify-between select-none min-w-[620px] sm:min-w-0 mx-auto min-h-[750px] sm:min-h-[850px] md:min-h-[920px]"
                        id="printable-prescription"
                        style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
                          backgroundColor: "#ffffff",
                          color: "#1e293b"
                        }}
                      >
                        <div>
                          {/* Header medical card */}
                          <div className="flex flex-row justify-between items-start pb-4 gap-4"
                            style={{
                              display: "flex",
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              paddingBottom: "16px",
                              gap: "16px"
                            }}>
                            {/* Left Logo Side */}
                            <div className="flex items-start">
                              <svg id="Capa_1" data-name="Capa 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 133.06 50.19" className="h-16 md:h-20 w-auto shrink-0 select-none">
                                <defs>
                                  <style>{`
                                    .cls-1{fill:#444548;}
                                    .cls-2{fill:#bf815e;}
                                    .cls-3{fill:#dc968b;}
                                    .cls-4{fill:#c89582;}
                                  `}</style>
                                </defs>
                                <title>logo 2karolT</title>
                                <g id="Capa_2" data-name="Capa 2">
                                  <g id="Capa_1-2" data-name="Capa 1-2">
                                    <g id="Capa_2-2" data-name="Capa 2-2">
                                      <g id="Capa_1-2-2" data-name="Capa_1-2-2">
                                        <path className="cls-1" d="M22.29,48.19A23,23,0,0,1,6.4,41.07a24.12,24.12,0,0,1-2.76-3.53,22,22,0,0,1-2-4A23.29,23.29,0,0,1,14.77,3.4a23.72,23.72,0,0,1,9.09-1.63,23.39,23.39,0,0,1,21,15.56A23.12,23.12,0,0,1,22.29,48.18m0-.19a22.35,22.35,0,0,0,4.4-.29A22,22,0,0,0,32,5.82a21,21,0,0,0-4-1.3A22.24,22.24,0,0,0,23.78,4a21.41,21.41,0,0,0-8.32,1.22,22,22,0,0,0-2,40.6A22.61,22.61,0,0,0,22.3,48" transform="translate(-0.04 0)"/>
                                        <path className="cls-2" d="M1,47.16A1.57,1.57,0,0,0,1.3,47l.27-.16a5.5,5.5,0,0,0,.5-.34,11.71,11.71,0,0,0,1-.76,15.68,15.68,0,0,0,1.62-1.64A17.13,17.13,0,0,0,7,40.61c.31-.61.59-1.23.84-1.87a9.72,9.72,0,0,0,.34-1l.16-.49c.06-.17.11-.34.17-.52.44-1.42.89-3,1.39-4.5s1-3.09,1.72-4.65A33,33,0,0,1,14,23.06a21.52,21.52,0,0,1,1.52-2.16,18.23,18.23,0,0,1,1.83-2,11.33,11.33,0,0,1,2.22-1.61,6.34,6.34,0,0,1,2.58-.81,11.31,11.31,0,0,0-1.33,2.08A20.67,20.67,0,0,0,20,20.71c-.51,1.44-.92,2.91-1.32,4.41-.8,3-1.56,6-2.56,9.14-.12.39-.25.78-.38,1.18s-.28.78-.42,1.17-.31.79-.46,1.19-.34.8-.52,1.2c-.1.2-.19.41-.29.61l-.08.15-.08.17c-.05.11-.11.21-.17.32l-.35.62c-.12.21-.25.41-.38.61a15.48,15.48,0,0,1-1.81,2.23,13.15,13.15,0,0,1-4.69,3.13,10.52,10.52,0,0,1-2.7.64,7.84,7.84,0,0,1-1.37,0,5.46,5.46,0,0,1-.69-.1l-.33-.09a.94.94,0,0,1-.4-.13" transform="translate(-0.04 0)"/>
                                        <path className="cls-3" d="M23.54,33.33a1.86,1.86,0,0,0,.28-.21l.26-.21.5-.44c.32-.3.63-.61.93-.91.59-.62,1.14-1.24,1.66-1.88a14,14,0,0,0,1.36-2.05,19.78,19.78,0,0,0,1-2.2c.29-.75.55-1.51.81-2.25l.18-.53.17-.51L31,21c.24-.75.5-1.54.78-2.34s.58-1.62.89-2.45c.62-1.65,1.3-3.32,2.11-5a32.07,32.07,0,0,1,2.85-4.83,24,24,0,0,1,1.82-2.21A18.67,18.67,0,0,1,41.65,2.3,11.65,11.65,0,0,1,46.75,0,18.37,18.37,0,0,0,43.6,4.09a29.32,29.32,0,0,0-2,4.47c-.56,1.54-1,3.12-1.48,4.74s-.89,3.25-1.35,4.93A33.19,33.19,0,0,1,37,23.37c-.2.44-.42.88-.67,1.32-.13.23-.26.45-.4.67s-.14.24-.21.34l-.22.3a18.67,18.67,0,0,1-2,2.22,25.47,25.47,0,0,1-2.22,1.92c-.77.58-1.57,1.13-2.39,1.63A12.22,12.22,0,0,1,26.36,33a10.65,10.65,0,0,1-1.36.3c-.24,0-.47.06-.71.07a4.33,4.33,0,0,1-.72,0" transform="translate(-0.04 0)"/>
                                        <path className="cls-4" d="M15.81,35h.54l.52.06a5.06,5.06,0,0,1,1,.2,15.49,15.49,0,0,1,1.86.6,15.23,15.23,0,0,1,3.17,1.73c.47.34.92.7,1.36,1.08l.63.59.31.3.34.34c.89.9,1.83,1.88,2.81,2.84s2,1.91,3.12,2.81A28.28,28.28,0,0,0,35,48.07a18.65,18.65,0,0,0,2,1,15,15,0,0,0,2.16.77,9.42,9.42,0,0,0,2.3.35,5.42,5.42,0,0,0,2.25-.42,9.68,9.68,0,0,1-1.81-1,16.52,16.52,0,0,1-1.51-1.26,36,36,0,0,1-2.73-2.8c-1.77-1.93-3.54-3.93-5.51-5.87-.24-.25-.5-.49-.75-.73l-.77-.72c-.26-.24-.54-.48-.82-.71S29.27,36.2,29,36l-.46-.34-.11-.09-.12-.08L28,35.28l-.51-.34c-.17-.11-.35-.21-.52-.3a12.36,12.36,0,0,0-2.23-1,11.21,11.21,0,0,0-4.74-.5,9,9,0,0,0-2.28.58,7.29,7.29,0,0,0-1,.52,3.12,3.12,0,0,0-.47.34,2.09,2.09,0,0,0-.22.2,1.24,1.24,0,0,0-.17.23" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M61.83,24.65l-.58-.91q-1.92-3-3.11-4.72a18.79,18.79,0,0,1-2.26,1.09v4.55H54.2V13.26h1.71V19a10.57,10.57,0,0,0,3.52-2.39,6.35,6.35,0,0,0,1.77-3.37H63a6.84,6.84,0,0,1-1.17,2.61,10.51,10.51,0,0,1-2.35,2.31c.67,1,1.37,2.08,2.09,3.12s1.51,2.15,2.35,3.33Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M73.3,18.46q2.22,5.09,2.77,6.21H74c-.35-.87-.69-1.72-1-2.55l-.18-.46H67.74c-.45,1.14-.84,2.14-1.15,3H65.06l.68-1.59q.36-.87,1.62-3.84T69.54,14a.42.42,0,0,1-.29-.24.73.73,0,0,1-.08-.46h1.58c.19,0,.32.06.37.18Zm-.88,2.08-.92-2.25L71,17q-.47-1.1-.69-1.8c-.31.92-.81,2.2-1.5,3.86-.4,1-.6,1.47-.61,1.5Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M84.29,24.67c-.09-.19-.47-.85-1.14-2s-1.15-1.82-1.39-2.2H78.93v4.18h-1.7V13.3H81a6.52,6.52,0,0,1,2.58.47A3.54,3.54,0,0,1,85.18,15a3.37,3.37,0,0,1,.55,2,3.24,3.24,0,0,1-.61,2,3.58,3.58,0,0,1-1.78,1.21c.41.67,1,1.55,1.62,2.62a18.25,18.25,0,0,0,1.22,1.89Zm-3.24-5.25a3.46,3.46,0,0,0,2.18-.6A2.09,2.09,0,0,0,84,17.06a2.4,2.4,0,0,0-.8-2,3.6,3.6,0,0,0-2.31-.67h-1.2a1.46,1.46,0,0,0-.55.07.3.3,0,0,0-.2.26v4.5a4.69,4.69,0,0,0,1.29.15Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M89.71,24.07A5.74,5.74,0,0,1,87.6,22a5.84,5.84,0,0,1-.77-3,6.16,6.16,0,0,1,.75-3,5.37,5.37,0,0,1,2.08-2.07,6.15,6.15,0,0,1,5.86,0,5.43,5.43,0,0,1,2.1,2.1,6.32,6.32,0,0,1,0,6,5.47,5.47,0,0,1-2.06,2.1,6.05,6.05,0,0,1-5.89,0m5-.84A3.76,3.76,0,0,0,96,21.8a4.73,4.73,0,0,0,.48-2.19A6.85,6.85,0,0,0,96,16.85a4.6,4.6,0,0,0-1.44-1.91,3.51,3.51,0,0,0-2.12-.68,3.91,3.91,0,0,0-2,.52,3.57,3.57,0,0,0-1.37,1.46,4.5,4.5,0,0,0-.49,2.1,7.38,7.38,0,0,0,.52,2.82,4.62,4.62,0,0,0,1.46,1.95,3.39,3.39,0,0,0,2.12.71,3.63,3.63,0,0,0,2-.54" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M99.75,24.66V13.26h1.7V23.38a5.28,5.28,0,0,0,1.19.12c2.42,0,3.84,0,4.28-.06v1.17Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M62.7,28.81H59.28V39.09H57.6V28.82c-1.14,0-2.27,0-3.41.05v-1.2h8.5Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M69.22,32.82Q71.43,37.91,72,39H69.92c-.36-.86-.69-1.71-1-2.55L68.74,36H63.67c-.45,1.13-.84,2.14-1.15,3H61l.68-1.59,1.62-3.83q1.26-3,2.17-5.25a.45.45,0,0,1-.3-.24.81.81,0,0,1-.08-.46h1.58c.19,0,.32.06.37.18Zm-.88,2.08-.92-2.25-.55-1.3q-.47-1.09-.69-1.8c-.31.91-.81,2.2-1.49,3.86l-.62,1.49Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M73.38,39V27.64h1.71v10.1a5.29,5.29,0,0,0,1.19.13c2.41,0,3.84,0,4.27-.07V39Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M90,32.84q2.22,5.08,2.76,6.21h-2c-.36-.87-.69-1.72-1-2.55l-.18-.5H84.47c-.46,1.14-.84,2.14-1.15,3H81.81l.68-1.59q.36-.87,1.62-3.84t2.17-5.24a.5.5,0,0,1-.3-.25.79.79,0,0,1-.08-.45h1.58a.34.34,0,0,1,.37.18Zm-.87,2.08-.93-2.24a9.51,9.51,0,0,0-.54-1.31c-.31-.73-.5-1.37-.66-1.79-.32.91-.81,2.19-1.5,3.85-.4,1-.6,1.47-.61,1.5Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M93.22,27.67l1,2.61L96.86,37c.59-1.59,1.28-3.36,2-5.33.85-2.2,1.36-3.52,1.53-4H102c-.31.62-.92,2-1.82,4.17s-1.85,4.57-2.85,7.21H96.08q-1.15-2.77-2.85-6.7c-1.13-2.62-1.83-4.19-2.08-4.7Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M108.73,37.9a13.75,13.75,0,0,0,1.9-.06V39h-7.57V27.63h7.31v1.19c-1.1,0-2.83-.07-5.18-.07-.26,0-.4.07-.44.21v3.63h.79c.81,0,2.06,0,3.72-.07v1.23h-4.51v4.06a5.48,5.48,0,0,0,1.34.11h2.64" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M119,39.05c-.09-.2-.47-.85-1.14-2s-1.13-1.85-1.38-2.23h-2.83V39H112V27.66h3.71a6.7,6.7,0,0,1,2.58.46,3.69,3.69,0,0,1,1.62,1.3,3.23,3.23,0,0,1,.55,1.91,3.18,3.18,0,0,1-.61,2,3.52,3.52,0,0,1-1.77,1.21l1.61,2.61c.67,1.07,1.08,1.7,1.23,1.9Zm-3.23-5.25a3.51,3.51,0,0,0,2.18-.59,2.08,2.08,0,0,0,.76-1.76,2.4,2.4,0,0,0-.8-1.95,3.51,3.51,0,0,0-2.3-.68H114.4a1.7,1.7,0,0,0-.55.07.28.28,0,0,0-.19.26v4.5a4.62,4.62,0,0,0,1.28.15Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M130.34,32.84q2.21,5.08,2.76,6.21H131c-.36-.87-.7-1.72-1-2.55l-.18-.46h-5.07c-.45,1.14-.84,2.14-1.15,3h-1.5l.69-1.59c.23-.58.77-1.86,1.61-3.84s1.56-3.73,2.17-5.24a.45.45,0,0,1-.29-.25.65.65,0,0,1-.08-.45h1.57a.35.35,0,0,1,.38.18Zm-.88,2.08-.93-2.24c-.05-.14-.23-.58-.54-1.31s-.54-1.33-.69-1.79c-.31.91-.81,2.19-1.49,3.85l-.62,1.5Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M57.39,43.27a2,2,0,0,1-1.92,2.08H54.23a.09.09,0,0,1-.08-.08h0v-4a.07.07,0,0,1,.05-.09h1A2,2,0,0,1,57.39,43,2.62,2.62,0,0,1,57.39,43.27Zm-.56,0a1.43,1.43,0,0,0-1.27-1.57,1.82,1.82,0,0,0-.33,0H54.7v3.14h.53a1.44,1.44,0,0,0,1.6-1.24A1.82,1.82,0,0,0,56.83,43.27Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M62.06,44.93v.32s0,.08-.07.09H59.44a.09.09,0,0,1-.09-.08h0v-4a.09.09,0,0,1,.08-.09H62a.09.09,0,0,1,.09.08h0v.33a.09.09,0,0,1-.08.08h-2.1v1.23h1.9a.09.09,0,0,1,.09.08h0v.32a.09.09,0,0,1-.08.09H59.91v1.4H62a.09.09,0,0,1,.09.09h0Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M67.11,45.24c0,.06,0,.1-.07.1h-.39a.11.11,0,0,1-.1-.06l-.77-1.48H64.7v1.45a.09.09,0,0,1-.08.09h-.39a.09.09,0,0,1-.09-.08h0v-4s0-.08.07-.09H65.7c1.09,0,1.49.46,1.49,1.3a1.12,1.12,0,0,1-.88,1.24ZM64.7,43.3h1c.55,0,.92-.15.92-.8s-.37-.8-.92-.8h-1Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M73.37,41.29v4a.09.09,0,0,1-.08.09H72.9a.09.09,0,0,1-.09-.08h0v-3l-1.26,3a.1.1,0,0,1-.1.07h-.37a.08.08,0,0,1-.1-.06h0l-1.26-3v3a.09.09,0,0,1-.08.09h-.39a.09.09,0,0,1-.09-.08h0v-4a.09.09,0,0,1,.08-.09h.48a.11.11,0,0,1,.11.06l1.43,3.46,1.43-3.46a.11.11,0,0,1,.11-.06h.48a.09.09,0,0,1,.09.08Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M78.8,45.34h-.39a.11.11,0,0,1-.1-.07l-.28-.8H76.13l-.3.8a.1.1,0,0,1-.1.08h-.38c-.07,0-.1-.05-.07-.11l1.5-4a.12.12,0,0,1,.11-.08h.37a.12.12,0,0,1,.11.08l1.51,4a.08.08,0,0,1-.06.1ZM77.8,44,77,41.89,76.3,44Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M83.33,41.29v.33a.09.09,0,0,1-.08.08H82v3.55a.09.09,0,0,1-.08.09h-.39a.09.09,0,0,1-.09-.08h0v-4H80.2s-.08,0-.09-.07h0V41.3a.09.09,0,0,1,.08-.09h3a.09.09,0,0,1,.09.08Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M85,43.29a2.12,2.12,0,1,1,2.12,2.13A2.12,2.12,0,0,1,85,43.29Zm3.69,0a1.58,1.58,0,1,0-1.57,1.61,1.58,1.58,0,0,0,1.57-1.61Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M93.94,44.93v.32s0,.08-.07.09H91.35s-.08,0-.09-.07h0v-4s0-.08.07-.09h.39s.08,0,.09.07h0V44.8h2s.08,0,.09.07Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M95.65,43.29a2.12,2.12,0,1,1,2.12,2.13,2.12,2.12,0,0,1-2.12-2.13Zm3.69,0a1.58,1.58,0,1,0-1.57,1.61,1.57,1.57,0,0,0,1.57-1.57v0Zm-1-3.23L98,40.8a.1.1,0,0,1-.1.08h-.28c-.07,0-.1,0-.07-.1L97.9,40a.12.12,0,0,1,.1,0h.29c.07,0,.1,0,.07.1Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M105.83,43.25v.23a1.82,1.82,0,0,1-1.69,1.94h-.2a2.14,2.14,0,0,1,0-4.27,2,2,0,0,1,1.41.57v.11h0l-.24.25H105a1.56,1.56,0,0,0-1-.4,1.6,1.6,0,0,0,0,3.19,1.26,1.26,0,0,0,1.36-1.16v-.07H104s-.08,0-.09-.07h0v-.32a.09.09,0,0,1,.08-.09h1.76s.08,0,.09.07h0Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M110.93,45.34h-.38a.08.08,0,0,1-.1-.07l-.28-.8h-1.91l-.29.8a.1.1,0,0,1-.1.08h-.39c-.06,0-.09-.05-.07-.11l1.51-4a.12.12,0,0,1,.11-.08h.37a.12.12,0,0,1,.11.08l1.51,4C111,45.3,111,45.34,110.93,45.34ZM110,44l-.77-2.1-.77,2.1Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M57.19,9.43a1.86,1.86,0,0,1-1.71,2H54.2a.08.08,0,0,1-.08-.07h0V7.56a.08.08,0,0,1,.07-.08h1a1.87,1.87,0,0,1,2,1.71Zm-.53,0A1.37,1.37,0,0,0,55.38,8h-.74v3h.5a1.37,1.37,0,0,0,1.52-1.18,1.61,1.61,0,0,0,0-.31Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M60.73,11.29c0,.06,0,.1-.06.1H60.3a.11.11,0,0,1-.1-.06l-.72-1.4h-1v1.38a.08.08,0,0,1-.07.08H58a.1.1,0,0,1-.09-.07h0V7.56A.09.09,0,0,1,58,7.48H59.4c1,0,1.4.43,1.4,1.22A1.06,1.06,0,0,1,60,9.88ZM58.45,9.46h1c.52,0,.86-.14.86-.76S60,8,59.44,8h-1Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M64.63,11.39h-.36a.1.1,0,0,1-.09-.07l-.28-.75H62.11l-.28.75a.08.08,0,0,1-.1.07h-.36c-.06,0-.09,0-.07-.09l1.43-3.75a.08.08,0,0,1,.1-.07h.35a.1.1,0,0,1,.1.07L64.7,11.3S64.7,11.39,64.63,11.39Zm-.9-1.28-.73-2-.72,2Z" transform="translate(-0.04 0)"/>
                                        <path className="cls-1" d="M65.29,11.07a.4.4,0,0,1,.37-.42.39.39,0,0,1,.42.36h0m0,.05a.39.39,0,0,1-.36.42h0a.41.41,0,0,1-.43-.37Z" transform="translate(-0.04 0)"/>
                                      </g>
                                    </g>
                                  </g>
                                </g>
                              </svg>
                            </div>

                             {/* Right Contact Side */}
                            <div className="text-right space-y-4 max-w-xs shrink-0 select-none"
                            style={{
                              textAlign: "right",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-end",
                              gap: "12px"
                            }}>
                              {/* Location block */}
                              <div className="flex items-start justify-end gap-2.5">
                                <div className="flex flex-col items-end text-right leading-[1.35]">
                                   <p className="font-normal text-slate-800 text-[16px] md:text-[17px] tracking-tight">{selectedPrescription.clinicName || 'Centro Médico Niño Jesús'}</p>
                                  {(() => {
                                    const addr = doctorProfile?.address || 'Av. Cañoto Nº 580, Rafael Peña. Piso 5, consultorio 512.';
                                    const parts = addr.split(',');
                                    if (parts.length >= 2) {
                                      const part1 = parts[0] + ',';
                                      const part2 = parts.slice(1).join(',').trim();
                                      return (
                                        <>
                                          <p className="text-slate-500 text-[11px] md:text-[11.5px] font-normal mt-0.5 leading-tight">{part1}</p>
                                          <p className="text-slate-500 text-[11px] md:text-[11.5px] font-normal leading-tight">{part2}</p>
                                        </>
                                      );
                                    }
                                    return <p className="text-slate-500 text-[11px] md:text-[11.5px] font-normal mt-0.5 leading-tight">{addr}</p>;
                                  })()}
                                </div>
                                <svg id="Capa_ubi" data-name="Capa ubi" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14.89 19.04" className="h-[21px] w-auto shrink-0 mt-0.5">
                                  <path className="fill-[#dc968b]" d="M14.87,7A8.57,8.57,0,0,1,14,10.62a25,25,0,0,1-3.26,5.16c-.66.84-1.34,1.65-2,2.46A1.67,1.67,0,0,1,7.5,19a1.29,1.29,0,0,1-.87-.25,9.21,9.21,0,0,1-1.38-1.48A39.16,39.16,0,0,1,1.48,12,13.35,13.35,0,0,1,.29,9.39,6.51,6.51,0,0,1,0,6.87,7.08,7.08,0,0,1,2.43,1.94,7.34,7.34,0,0,1,6.71,0a7.48,7.48,0,0,1,7.93,5.4q.09.36.15.72C14.84,6.49,14.86,6.82,14.87,7ZM7.45,4.07a3.38,3.38,0,1,0,3.38,3.39A3.38,3.38,0,0,0,7.45,4.07Z" transform="translate(0.02 0.04)"/>
                                </svg>
                              </div>

                              {/* Phone block */}
                              <div className="flex items-center justify-end gap-2.5 pt-0.5">
                                <span className="font-normal text-slate-800 text-[17px] md:text-[18px] tracking-tight leading-none">{doctorProfile?.phone || '73887070'}</span>
                                <svg id="Capa_wa" data-name="Capa wa" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16.68 16.68" className="h-[21px] w-auto shrink-0">
                                  <path className="fill-[#dc968b]" d="M7.72,0H9a4.08,4.08,0,0,1,.77.11,8.28,8.28,0,0,1,6.78,6.72c.05.29.09.59.13.88V8.92a5.19,5.19,0,0,1-.13.88,8.16,8.16,0,0,1-3,5,8.22,8.22,0,0,1-9.65.59.27.27,0,0,0-.3,0l-2.47.79-.58.18c.33-1,.66-2,1-2.92a.32.32,0,0,0,0-.33A8.15,8.15,0,0,1,.15,6.78,8.11,8.11,0,0,1,2.74,2.17a8,8,0,0,1,4.15-2ZM3.51,6.1a3.21,3.21,0,0,0,.22,1.18A7.39,7.39,0,0,0,4.82,9.11a9.39,9.39,0,0,0,5.07,3.67,3.13,3.13,0,0,0,1.74.15,2,2,0,0,0,1.73-2.12.3.3,0,0,0-.2-.33l-1.89-.91a.47.47,0,0,0-.65.14l0,.06c-.18.24-.35.48-.54.71a.53.53,0,0,1-.73.18h0A6.51,6.51,0,0,1,6.08,7.82a.36.36,0,0,1,0-.49l.58-.68A.53.53,0,0,0,6.76,6c-.24-.55-.47-1.12-.7-1.68s-.26-.54-.8-.54a1.27,1.27,0,0,0-1,.36A2.64,2.64,0,0,0,3.51,6.1Z"/>
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Top Subtitle license block */}
                          <p className="text-[11px] text-slate-400 mt-1 leading-none pl-1">
                            Cédula Profesional: <strong className="text-slate-600 font-bold">{selectedPrescription.doctorLicense || '10293847'}</strong>
                          </p>

                          {/* Solid Divider */}
                          <div className="border-b border-[#eae6e1] my-4"></div>

                          {/* Patient metadata box */}
                          <div className="bg-[#fbfaf8] border border-[#eae6e1] rounded-xl p-4 grid grid-cols-3 gap-4 text-xs text-slate-600"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                              backgroundColor: "#fbfaf8",
                              border: "1px solid #eae6e1",
                              borderRadius: "12px",
                              padding: "16px",
                              gap: "16px"
                            }}>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">PACIENTES</span>
                              <span className="text-sm font-semibold text-brand-charcoal mt-1 block leading-tight">{selectedPrescription.patientName}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">FECHA DE EMISIÓN</span>
                              <span className="text-sm font-semibold text-brand-charcoal mt-1 block leading-tight">
                                {new Date(selectedPrescription.createdAt).toLocaleDateString()} {new Date(selectedPrescription.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">DIAGNÓSTICO</span>
                              <span className="text-sm font-semibold text-brand-charcoal mt-1 block leading-tight truncate" title={selectedPrescription.diagnosis}>
                                {selectedPrescription.diagnosis}
                              </span>
                            </div>
                          </div>

                          {/* Rx section heading */}
                          <div className="mt-7 space-y-3">
                            <div className="flex items-center justify-between border-b border-[#eae6e1] pb-2">
                              <h3 className="text-base sm:text-lg font-black text-brand-charcoal tracking-tight">Prescripción de Medicamentos</h3>
                              <span className="text-[10px] sm:text-[11px] font-bold text-[#b57367] uppercase tracking-wider">Tratamiento e Indicaciones</span>
                            </div>

                            {/* Clean Medical Prescription Items List */}
                            <div className="space-y-6 pt-2">
                              {(() => {
                                try {
                                  const items: MedicationItem[] = JSON.parse(selectedPrescription.medications);
                                  if (!items || items.length === 0) {
                                    return <p className="text-xs text-slate-400 italic py-4 text-center">No se registraron medicamentos para esta receta.</p>;
                                  }

                                  return items.map((med, idx) => {
                                    const line1 = formatMedicationLine1(med, idx);
                                    const line2 = formatMedicationLine2(med);

                                    return (
                                      <div key={idx} className="space-y-1.5 text-left">
                                        {/* Line 1: 1. Clobetasol propionato 0,05 % crema (Clopicar) # 1 tubo */}
                                        <div className="font-bold text-slate-900 text-[14px] md:text-[15px] leading-snug tracking-tight">
                                          {line1}
                                        </div>

                                        {/* Line 2: Aplicar una capa fina sobre las lesiones del brazo, 2 veces al día durante 3 semanas. */}
                                        {line2 && (
                                          <div className="text-slate-700 font-normal text-[13px] md:text-[13.5px] leading-relaxed pl-4 sm:pl-5">
                                            {line2}
                                          </div>
                                        )}

                                        {/* Additional custom notes if present and distinct */}
                                        {med.notes && med.notes !== med.fullIndication && med.notes !== line2 && med.notes.trim() !== "" && (
                                          <div className="text-[11.5px] text-[#b57367] italic pl-4 sm:pl-5">
                                            Nota: {med.notes}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  });
                                } catch (e) {
                                  return (
                                    <div className="py-4 text-center text-red-500 text-xs">Error al cargar tratamiento</div>
                                  );
                                }
                              })()}
                            </div>
                          </div>

                          {/* Non-pharmacological advice */}
                          {selectedPrescription.instructions && (
                            <div className="mt-6 bg-[#fbfaf8] border border-[#eae6e1] rounded-xl p-4 space-y-1">
                              <h4 className="text-[10px] font-bold text-brand-rose uppercase tracking-wider flex items-center gap-1.5">
                                <Activity className="h-3 w-3" />
                                Indicaciones Generales y Cuidados
                              </h4>
                              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedPrescription.instructions}</p>
                            </div>
                          )}
                        </div>

                        {/* Bottom Segment: Signature & Social Footer */}
                        <div className="space-y-6 mt-auto pt-8 shrink-0">
                          {/* Doctor's Signature space */}
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-64 border-b border-slate-300 pb-1">
                              {/* Empty space for handwriting signature */}
                              <div className="h-12"></div>
                            </div>
                            <p className="text-xs font-bold text-brand-charcoal mt-2">Dra. {selectedPrescription.doctorName.replace(/dra\./gi, '').replace(/dr\./gi, '').trim()}</p>
                            <p className="text-[10px] text-slate-400">Especialista en {doctorProfile?.specialty || 'Dermatología'}</p>
                          </div>

                          {/* Social Footer Banner bar */}
                          <div className="bg-[#cc8576] text-white flex flex-row items-center justify-around py-2.5 px-4 rounded-xl text-[10px] -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 md:-mx-12 md:-mb-12 print:-mx-0 print:-mb-0"
                            style={{
                              backgroundColor: "#cc8576",
                              color: "#ffffff",
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "space-around",
                              padding: "10px 16px",
                              borderRadius: "12px"
                            }}>
                            {/* TikTok */}
                            <div className="flex items-center gap-1.5">
                              <svg id="Capa_1" data-name="Capa 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14.81 15.11" className="h-4 w-4 shrink-0 fill-white">
                                <title>tiktokiconos</title>
                                <g id="Capa_2" data-name="Capa 2">
                                  <g id="Capa_1-2" data-name="Capa 1-2">
                                    <path fill="#fff" d="M7.91,0H7.7a7.56,7.56,0,0,0-.19,15.11h.2A7.56,7.56,0,0,0,7.91,0ZM7.52,14.61A7.06,7.06,0,0,1,7.7.5h.19a7.06,7.06,0,0,1,4.67,12.18A6.94,6.94,0,0,1,7.52,14.61Z" transform="translate(-0.3)"/>
                                    <path fill="#fff" d="M9.39,3.36H8V3.5L7.87,9.06a1.5,1.5,0,0,1,0,.3,1.28,1.28,0,0,1-2.52-.08,1.25,1.25,0,0,1,.94-1.35,4.45,4.45,0,0,1,.73,0V6.55a6.32,6.32,0,0,0-.87,0,2.62,2.62,0,0,0-2.22,3v0A2.66,2.66,0,0,0,7,11.71l.17,0a2.58,2.58,0,0,0,2-2.35c.05-1,.06-2,.08-3v-.2a3.47,3.47,0,0,0,2.12.78V5.54a2.11,2.11,0,0,1-1.48-.67A2.19,2.19,0,0,1,9.39,3.36Z" transform="translate(-0.3)"/>
                                  </g>
                                </g>
                              </svg>
                              <span className="font-medium">{doctorProfile?.tiktok || '@dra.karoltalavera'}</span>
                            </div>

                            {/* Facebook */}
                            <div className="flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-white shrink-0 fill-current" viewBox="0 0 24 24">
                                <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                              </svg>
                              <span className="font-medium">{doctorProfile?.facebook || 'Dra. Karol Talavera - Dermatóloga'}</span>
                            </div>

                            {/* Instagram */}
                            <div className="flex items-center gap-1.5">
                              <svg className="h-3.5 w-3.5 text-white shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                              </svg>
                              <span className="font-medium">{doctorProfile?.instagram || '@dermatista'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 space-y-3 flex flex-col items-center justify-center h-80">
                    <FileText className="h-12 w-12 text-slate-300" />
                    <div>
                      <p className="font-bold text-slate-700 text-base">Seleccione una receta médica</p>
                      <p className="text-sm">Haga clic en la lista de la izquierda para ver el formato de impresión y los medicamentos recetados.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: SETTINGS / CLINIC PROFILE */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl bg-white rounded-2xl border border-brand-border shadow-sm p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-brand-charcoal">Mi Consultorio Médico</h2>
                <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Configura tus credenciales y membrete clínico para el encabezado y pie de tus recetas.</p>
              </div>

              {isProfileSaveSuccess && (
                <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs sm:text-sm">
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-emerald-600" />
                  <span>¡Configuración de consultorio guardada con éxito y sincronizada!</span>
                </div>
              )}

              <form onSubmit={handleSaveSettings} className="space-y-3.5 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Nombre Completo del Médico</label>
                    <input 
                      type="text"
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                      placeholder="Dr. Alejandro Gómez"
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs sm:text-sm transition font-medium bg-brand-linen/10"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Cédula Profesional o ID de Licencia</label>
                    <input 
                      type="text"
                      value={settingsForm.licenseId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, licenseId: e.target.value })}
                      placeholder="A-92817291"
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs sm:text-sm transition font-medium bg-brand-linen/10"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Especialidad</label>
                    <input 
                      type="text"
                      value={settingsForm.specialty}
                      onChange={(e) => setSettingsForm({ ...settingsForm, specialty: e.target.value })}
                      placeholder="Dermatología / Estética"
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs sm:text-sm transition bg-brand-linen/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Nombre de la Clínica / Consultorio</label>
                    <input 
                      type="text"
                      value={settingsForm.clinicName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, clinicName: e.target.value })}
                      placeholder="Centro Médico Niño Jesús"
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs sm:text-sm transition bg-brand-linen/10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Teléfono del Consultorio</label>
                    <input 
                      type="text"
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                      placeholder="73887070"
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs sm:text-sm transition bg-brand-linen/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] sm:text-xs font-bold text-slate-700 uppercase mb-1">Dirección del Consultorio</label>
                    <input 
                      type="text"
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      placeholder="Av. Cañoto Nº 580, Rafael Peña. Piso 5..."
                      className="w-full px-3 py-2 sm:px-4 sm:py-2.5 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs sm:text-sm transition bg-brand-linen/10"
                    />
                  </div>
                </div>

                {/* Social networks configured for the print footer */}
                <div className="space-y-2.5 pt-1">
                  <h4 className="text-[11px] sm:text-xs font-bold text-brand-rose uppercase tracking-widest border-b border-brand-border pb-1">Redes Sociales (Pie de Impresión de Receta)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">TikTok</label>
                      <input 
                        type="text"
                        value={settingsForm.tiktok || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, tiktok: e.target.value })}
                        placeholder="@dra.karoltalavera"
                        className="w-full px-3 py-1.5 border border-brand-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose bg-brand-linen/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Facebook</label>
                      <input 
                        type="text"
                        value={settingsForm.facebook || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, facebook: e.target.value })}
                        placeholder="Dra. Karol Talavera"
                        className="w-full px-3 py-1.5 border border-brand-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose bg-brand-linen/10"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Instagram</label>
                      <input 
                        type="text"
                        value={settingsForm.instagram || ''}
                        onChange={(e) => setSettingsForm({ ...settingsForm, instagram: e.target.value })}
                        placeholder="@dermatista"
                        className="w-full px-3 py-1.5 border border-brand-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose bg-brand-linen/10"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 sm:pt-4 border-t border-brand-border flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-slate-400 text-[11px] sm:text-xs flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    <span>Último cambio: {settingsForm.updatedAt ? new Date(settingsForm.updatedAt).toLocaleDateString() : 'Nunca'}</span>
                  </div>
                  <button 
                    type="submit"
                    disabled={profileLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-brand-rose hover:bg-brand-rose/90 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    {profileLoading && <Loader2 className="h-4 w-4 animate-spin text-white" />}
                    <span>Guardar Configuración</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: MEDICAMENTOS Y FÓRMULAS */}
          {activeTab === 'medications' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8 animate-in fade-in duration-200 items-start">
              {/* Left Column: Form / Construction (Broadened to 5/12 columns with comfortable spacing) */}
              <div className="lg:col-span-6 xl:col-span-5 bg-white rounded-2xl border border-brand-border shadow-sm p-6 lg:p-7 space-y-6">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-brand-rose">
                      <Pill className="h-5 w-5" />
                      <h3 className="text-lg font-bold text-brand-charcoal">
                        {editingCatalogMedId ? 'Modificar Medicamento / Fórmula' : 'Construcción de Medicamento'}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChipsEditMode(!isChipsEditMode)}
                      className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold flex items-center gap-1 transition cursor-pointer self-start sm:self-auto ${
                        isChipsEditMode
                          ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-bold'
                          : 'bg-brand-linen text-slate-600 border-brand-border hover:border-brand-rose/40 hover:text-brand-rose'
                      }`}
                      title="Activar o desactivar modo para quitar o agregar opciones rápidas"
                    >
                      <Settings className="h-3 w-3" />
                      <span>{isChipsEditMode ? '✓ Finalizar gestión de opciones' : 'Gestionar opciones rápidas'}</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {editingCatalogMedId 
                      ? 'Editando datos de la fórmula seleccionada. Haz clic en Guardar Cambios para actualizarla.'
                      : 'Crea fórmulas magistrales o medicamentos con posología estructurada e indicación generada automáticamente.'}
                  </p>
                </div>

                {editingCatalogMedId && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900 animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <Edit3 className="h-4 w-4 text-amber-700 shrink-0" />
                      <span>Modo edición activo</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelCatalogEdit}
                      className="px-2 py-0.5 bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 rounded-md font-bold text-[11px] cursor-pointer"
                    >
                      Cancelar Edición
                    </button>
                  </div>
                )}

                {catalogSaveSuccess && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span>¡Fórmula guardada y respaldada con éxito en el catálogo!</span>
                  </div>
                )}

                <form onSubmit={handleCreateCatalogMedication} className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-black/90 uppercase tracking-wider">Categoría *</label>
                      <button 
                        type="button" 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[11px] font-bold text-brand-rose hover:text-brand-rose/90 flex items-center gap-1.5 hover:underline cursor-pointer bg-brand-rose/10 px-2 py-0.5 rounded-md transition"
                        title="Agregar, modificar o eliminar categorías"
                      >
                        <Tag className="h-3 w-3" />
                        <span>Modificar Categorías</span>
                      </button>
                    </div>
                    <select 
                      value={newCatalogMed.category}
                      onChange={(e) => setNewCatalogMed({ ...newCatalogMed, category: e.target.value })}
                      className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm bg-brand-linen/10 font-semibold text-slate-800"
                      required
                    >
                      {presets.categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    {/* Quick Category Selection Chips */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {presets.categories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCatalogMed({ ...newCatalogMed, category: cat })}
                          className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer ${
                            newCatalogMed.category === cat
                              ? 'bg-brand-rose text-white border-brand-rose font-bold shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-brand-linen/60 font-medium'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* DATOS DEL MEDICAMENTO */}
                  <div className="space-y-3 pt-1 border-t border-brand-border/60">
                    <span className="block text-[10px] font-black text-brand-rose uppercase tracking-widest">
                      1. Datos del Medicamento
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre genérico *</label>
                        <input 
                          type="text"
                          value={newCatalogMed.genericName}
                          onChange={(e) => setNewCatalogMed({ ...newCatalogMed, genericName: e.target.value })}
                          placeholder="Ej. Clobetasol"
                          className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs bg-brand-linen/10 font-medium"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre comercial <span className="text-[10px] font-normal text-slate-400">(Opcional)</span></label>
                        <input 
                          type="text"
                          value={newCatalogMed.commercialName}
                          onChange={(e) => setNewCatalogMed({ ...newCatalogMed, commercialName: e.target.value })}
                          placeholder="Ej. Clopicar"
                          className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs bg-brand-linen/10 font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Concentración / presentación</label>
                      <input 
                        type="text"
                        value={newCatalogMed.concentration}
                        onChange={(e) => setNewCatalogMed({ ...newCatalogMed, concentration: e.target.value })}
                        placeholder="Ej. 0,05% — tubo de 25 g"
                        className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs bg-brand-linen/10"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingOptionsInput
                        label="Forma farmacéutica"
                        value={newCatalogMed.pharmaceuticalForm}
                        onChange={(val) => setNewCatalogMed({ ...newCatalogMed, pharmaceuticalForm: val })}
                        group="forms"
                        options={presets.forms}
                        placeholder="Ej. Crema / Gel / Cápsula"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />

                      <FloatingOptionsInput
                        label="Cantidad"
                        value={newCatalogMed.quantity}
                        onChange={(val) => setNewCatalogMed({ ...newCatalogMed, quantity: val })}
                        group="quantities"
                        options={presets.quantities}
                        placeholder="Ej. 1 tubo / 1 frasco / 30 cápsulas"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />
                    </div>
                  </div>

                  {/* INDICACIONES */}
                  <div className="space-y-3 pt-3 border-t border-brand-border/60">
                    <span className="block text-[10px] font-black text-brand-rose uppercase tracking-widest">
                      2. Indicaciones
                    </span>

                    <FloatingOptionsInput
                      label="Indicación base / Instrucción"
                      value={newCatalogMed.baseInstruction}
                      onChange={(val) => setNewCatalogMed({ ...newCatalogMed, baseInstruction: val })}
                      group="baseInstructions"
                      options={presets.baseInstructions}
                      placeholder='Ej. "Capa fina sobre las lesiones"'
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingOptionsInput
                        label="Vía de administración"
                        value={newCatalogMed.route}
                        onChange={(val) => setNewCatalogMed({ ...newCatalogMed, route: val })}
                        group="routes"
                        options={presets.routes || DEFAULT_PRESETS.routes || []}
                        placeholder="Ej. Tópica / Oral"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />

                      <FloatingOptionsInput
                        label="Frecuencia"
                        value={newCatalogMed.frequency}
                        onChange={(val) => setNewCatalogMed({ ...newCatalogMed, frequency: val })}
                        group="frequencies"
                        options={presets.frequencies}
                        placeholder="Ej. 2 veces al día"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingOptionsInput
                        label="Lugar de aplicación"
                        value={newCatalogMed.applicationSite}
                        onChange={(val) => setNewCatalogMed({ ...newCatalogMed, applicationSite: val })}
                        group="applicationSites"
                        options={presets.applicationSites}
                        placeholder="Ej. Lesiones de brazo / Cara"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />

                      <FloatingOptionsInput
                        label="Período de tratamiento"
                        value={newCatalogMed.treatmentPeriod}
                        onChange={(val) => setNewCatalogMed({ ...newCatalogMed, treatmentPeriod: val })}
                        group="treatmentPeriods"
                        options={presets.treatmentPeriods}
                        placeholder="Ej. 3 semanas / 1 mes"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />
                    </div>
                  </div>

                  {/* VISTA PREVIA EN TIEMPO REAL */}
                  {(() => {
                    const preview = formatStructuredIndication({
                      baseInstruction: newCatalogMed.baseInstruction,
                      route: newCatalogMed.route,
                      frequency: newCatalogMed.frequency,
                      applicationSite: newCatalogMed.applicationSite,
                      treatmentPeriod: newCatalogMed.treatmentPeriod
                    });

                    return (
                      <div className="bg-[#fbf5f4] border border-[#ead5d0] rounded-xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#b57367] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Vista Previa de la Posología
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Se imprime en la receta</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium italic bg-white p-2.5 rounded-lg border border-[#ead5d0]/70 leading-relaxed shadow-2xs">
                          "{preview || 'Complete las indicaciones arriba para ver la vista previa en tiempo real...'}"
                        </p>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones adicionales <span className="text-[10px] font-normal text-slate-400">(Opcional)</span></label>
                    <textarea 
                      value={newCatalogMed.customNotes}
                      onChange={(e) => setNewCatalogMed({ ...newCatalogMed, customNotes: e.target.value })}
                      placeholder="Ej. Evitar exposición al sol directo durante el tratamiento."
                      rows={2}
                      className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs bg-brand-linen/10 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    {editingCatalogMedId && (
                      <button 
                        type="button"
                        onClick={handleCancelCatalogEdit}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="flex-1 py-2.5 bg-brand-rose hover:bg-brand-rose/90 text-white font-semibold rounded-xl text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      {editingCatalogMedId ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          <span>Guardar Cambios</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>Guardar en Catálogo</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: List & Filters (Spacious 7/12 columns on desktop) */}
              <div className="lg:col-span-6 xl:col-span-7 bg-white rounded-2xl border border-brand-border shadow-sm p-6 lg:p-7 space-y-6 flex flex-col">
                <div className="flex flex-col gap-3 border-b border-brand-border pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-brand-charcoal">Catálogo de Fórmulas y Medicamentos</h3>
                      <p className="text-xs text-slate-500">Administra los compuestos guardados en tu recetario dermatológico ({filteredCatalogMedications.length} de {catalogMedications.length} registrados).</p>
                    </div>
                    
                    <div className="relative max-w-xs w-full">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input 
                        type="text"
                        value={catalogSearch}
                        onChange={(e) => setCatalogSearch(e.target.value)}
                        placeholder="Buscar por nombre o nota..."
                        className="w-full pl-10 pr-4 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm bg-brand-linen/10"
                      />
                    </div>
                  </div>

                  {/* Category Filter Pills Bar */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`text-xs px-3 py-1 rounded-lg border font-medium transition cursor-pointer ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-brand-rose text-white border-brand-rose shadow-2xs font-semibold'
                          : 'bg-white text-slate-600 border-brand-border hover:bg-brand-linen/50'
                      }`}
                    >
                      Todas ({catalogMedications.length})
                    </button>
                    {presets.categories.map(cat => {
                      const count = catalogMedications.filter(m => m.category === cat).length;
                      const isSelected = selectedCategoryFilter === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setSelectedCategoryFilter(cat)}
                          className={`text-xs px-3 py-1 rounded-lg border font-medium transition cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-brand-rose text-white border-brand-rose shadow-2xs font-semibold'
                              : 'bg-white text-slate-600 border-brand-border hover:bg-brand-linen/50'
                          }`}
                        >
                          <span>{cat}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setIsCategoryModalOpen(true)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-brand-rose/40 text-brand-rose bg-brand-rose/5 hover:bg-brand-rose/15 font-semibold transition cursor-pointer flex items-center gap-1 ml-auto"
                      title="Administrar categorías (agregar, modificar, quitar)"
                    >
                      <Tag className="h-3 w-3" />
                      <span>Gestionar Categorías</span>
                    </button>
                  </div>
                </div>

                {filteredCatalogMedications.length === 0 ? (
                  <div className="text-center py-24 text-slate-400 flex-1 flex flex-col items-center justify-center space-y-3">
                    <Pill className="h-12 w-12 text-slate-300" />
                    <div>
                      <p className="font-bold text-slate-700 text-base">Catálogo Vacío o sin coincidencias</p>
                      <p className="text-xs max-w-sm mx-auto">Construye tu primer medicamento o fórmula personalizada en el panel izquierdo para comenzar a acelerar tus prescripciones médicas.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[62vh] pr-1">
                    {filteredCatalogMedications.map((med) => (
                      <div 
                        key={med.id} 
                        className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 transition group ${
                          editingCatalogMedId === med.id 
                            ? 'bg-brand-rose/5 border-brand-rose ring-2 ring-brand-rose/30 shadow-md' 
                            : 'bg-brand-linen/20 border-brand-border hover:border-brand-rose/40'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              med.category === 'Fórmula Magistral' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              med.category === 'Medicamento Comercial' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                              med.category === 'Cuidado Skin Care' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-slate-50 text-slate-700 border-slate-200'
                            }`}>
                              {med.category}
                            </span>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditCatalogMedication(med)}
                                className="text-slate-500 hover:text-brand-rose p-1.5 rounded-lg hover:bg-brand-linen/60 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                title="Editar fórmula"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Editar</span>
                              </button>
                              <button 
                                onClick={() => handleDeleteCatalogMedication(med.id)}
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition cursor-pointer"
                                title="Eliminar de catálogo"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <h4 className="font-bold text-sm text-brand-charcoal group-hover:text-brand-rose transition leading-snug">
                            {formatMedicationLine1(med)}
                          </h4>
                          
                          <div className="text-xs text-slate-600 space-y-1.5 pt-1 border-t border-brand-border/40">
                            <div className="bg-white p-2.5 rounded-lg border border-brand-border/40 space-y-1">
                              <span className="block text-[9.5px] font-bold text-brand-rose uppercase tracking-wider">Posología e Indicación:</span>
                              <p className="text-[12px] text-slate-800 font-medium italic leading-relaxed">
                                "{formatMedicationLine2(med)}"
                              </p>
                            </div>
                            {med.customNotes && med.customNotes !== med.fullIndication && med.customNotes.trim() !== "" && (
                              <p className="text-slate-500 italic text-[11px] px-1">Obs: {med.customNotes}</p>
                            )}
                          </div>
                        </div>

                        {/* Card bottom quick action */}
                        <div className="pt-2 border-t border-brand-border/40 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setMedForm({
                                genericName: med.genericName || med.name || '',
                                commercialName: med.commercialName || '',
                                concentration: med.concentration || med.dose || '',
                                pharmaceuticalForm: med.pharmaceuticalForm || 'Crema',
                                quantity: med.quantity || '1 tubo',
                                baseInstruction: med.baseInstruction || 'Capa fina sobre las lesiones',
                                route: med.route || 'Tópica',
                                frequency: med.frequency || '2 veces al día',
                                applicationSite: med.applicationSite || 'Lesiones de brazo',
                                treatmentPeriod: med.treatmentPeriod || med.duration || '3 semanas',
                                customNotes: med.customNotes || (med.notes !== med.fullIndication ? med.notes : '') || ''
                              });
                              setActiveTab('prescriptions');
                              setIsPrescriptionModalOpen(true);
                            }}
                            className="w-full sm:w-auto px-3 py-1.5 bg-brand-rose/10 hover:bg-brand-rose text-brand-rose hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Usar en Nueva Receta</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODAL 1: REGISTRAR PACIENTE NUEVO */}
      {isPatientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 bg-brand-linen/40 border-b border-brand-border flex justify-between items-center">
              <div className="flex items-center gap-2 text-brand-rose">
                <UserPlus className="h-5 w-5" />
                <h3 className="font-bold text-brand-charcoal text-lg">Registrar Nuevo Paciente</h3>
              </div>
              <button 
                onClick={() => setIsPatientModalOpen(false)}
                className="text-slate-400 hover:text-brand-rose font-bold transition text-lg px-2 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/90 uppercase mb-1">Nombre(s) *</label>
                  <input 
                    type="text"
                    value={patientForm.name}
                    onChange={(e) => setPatientForm({ ...patientForm, name: e.target.value })}
                    placeholder="Juan Carlos"
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black/90 uppercase mb-1">Apellidos *</label>
                  <input 
                    type="text"
                    value={patientForm.lastName}
                    onChange={(e) => setPatientForm({ ...patientForm, lastName: e.target.value })}
                    placeholder="López Pérez"
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/90 uppercase mb-1">
                    Fecha de Nacimiento
                    <span className="text-brand-rose font-black ml-1 normal-case">{calculateAge(patientForm.dob)}</span>
                  </label>
                  <input 
                    type="date"
                    value={patientForm.dob}
                    onChange={(e) => setPatientForm({ ...patientForm, dob: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-black/90 uppercase mb-1">Género</label>
                  <select 
                    value={patientForm.gender}
                    onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                  >
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-black/90 uppercase mb-1">Alergias Conocidas <span className="text-xs font-normal text-slate-400 normal-case">(Opcional)</span></label>
                <input 
                  type="text"
                  value={patientForm.allergies}
                  onChange={(e) => setPatientForm({ ...patientForm, allergies: e.target.value })}
                  placeholder="Ej. Penicilina, Sulfas, Aspirina (o dejar en blanco)"
                  className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-black/90 uppercase mb-1">Historial Clínico / Antecedentes <span className="text-xs font-normal text-slate-400 normal-case">(Opcional)</span></label>
                <textarea 
                  value={patientForm.history}
                  onChange={(e) => setPatientForm({ ...patientForm, history: e.target.value })}
                  placeholder="Hipertensión bajo control, asma infantil (o dejar en blanco)..."
                  rows={3}
                  className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition resize-none bg-brand-linen/10"
                />
              </div>

              <div className="pt-4 border-t border-brand-border flex justify-end gap-2">
                <button 
                  type="button"
                  onClick={() => setIsPatientModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-brand-linen border border-brand-border text-brand-charcoal text-sm font-semibold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-brand-rose hover:bg-brand-rose/90 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-brand-rose/10 cursor-pointer"
                >
                  Registrar Paciente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR RECETA MÉDICA (CON ASISTENTE IA GEMINI INTEGRADO) */}
      {isPrescriptionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex sm:items-center sm:justify-center p-0 sm:p-4 z-50 overflow-hidden no-print">
          <div className="bg-white rounded-none sm:rounded-2xl border-0 sm:border sm:border-brand-border shadow-none sm:shadow-2xl max-w-full sm:max-w-3xl w-full h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in sm:zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 bg-brand-linen/60 sm:bg-brand-linen/40 border-b border-brand-border flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5 text-brand-rose min-w-0">
                <div className="p-1.5 bg-brand-rose/10 rounded-lg shrink-0">
                  <FileText className="h-5 w-5 text-brand-rose" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-brand-charcoal text-base sm:text-lg truncate">Emitir Receta Médica Realtime</h3>
                  <p className="text-[11px] text-slate-500 sm:hidden">Diligencia los datos y medicamentos del paciente</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-brand-rose hover:bg-brand-rose/10 font-bold transition rounded-lg text-lg flex items-center justify-center cursor-pointer shrink-0"
                title="Cerrar"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6">
              
              {/* Select Patient & Diagnosis */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-black/90 uppercase tracking-wider mb-1">Paciente *</label>
                  <select 
                    value={prescriptionForm.patientId}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patientId: e.target.value })}
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                    required
                  >
                    <option value="">-- Selecciona un paciente --</option>
                    {allAvailablePatients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} {p.lastName} {p.allergies ? `[Alergias: ${p.allergies}]` : ''}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/90 uppercase tracking-wider mb-1">Diagnóstico Clínico *</label>
                  <input 
                    type="text"
                    value={prescriptionForm.diagnosis}
                    onChange={(e) => setPrescriptionForm({ ...prescriptionForm, diagnosis: e.target.value })}
                    placeholder="Ej. Infección de vías respiratorias / Gastroenteritis aguda"
                    className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-sm transition bg-brand-linen/10"
                    required
                  />
                </div>
              </div>

              {/* ADD MEDICATIONS IN REAL TIME */}
              <div className="space-y-4">
                <span className="block text-xs font-bold text-black/90 uppercase tracking-wider">Medicamentos Prescritos</span>
                
                {/* Current prescription line items list */}
                <div className="bg-brand-linen/30 rounded-xl p-3 border border-brand-border space-y-2 max-h-48 overflow-y-auto">
                  {prescriptionForm.medications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No has agregado medicamentos. Completa los campos en el constructor abajo para agregar el primero.</p>
                  ) : (
                    prescriptionForm.medications.map((med, index) => (
                      <div key={index} className="flex items-start justify-between bg-white p-3 rounded-xl border border-brand-border gap-3 shadow-2xs">
                        <div className="text-xs space-y-1.5 flex-1 text-left">
                          <div className="font-bold text-slate-900 text-[13px] leading-snug">
                            {formatMedicationLine1(med, index)}
                          </div>
                          <div className="text-slate-700 text-[12px] pl-3 leading-relaxed">
                            {formatMedicationLine2(med)}
                          </div>
                          {med.notes && med.notes !== med.fullIndication && med.notes !== formatMedicationLine2(med) && med.notes.trim() !== "" && (
                            <div className="text-[11px] text-[#b57367] italic pl-3">
                              Nota: {med.notes}
                            </div>
                          )}
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeMedicationItem(index)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
                          title="Remover medicamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Constructor controls row */}
                <div className="bg-white p-4 border border-brand-border rounded-xl space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-brand-border/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-brand-rose">
                        <Pill className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Constructor de Medicamento</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsChipsEditMode(!isChipsEditMode)}
                        className={`text-[10px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1 transition cursor-pointer ${
                          isChipsEditMode
                            ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                            : 'bg-brand-linen text-slate-600 border-brand-border hover:border-brand-rose/40 hover:text-brand-rose'
                        }`}
                        title="Activar o desactivar modo para quitar o agregar opciones rápidas"
                      >
                        <Settings className="h-3 w-3" />
                        <span>{isChipsEditMode ? '✓ Listo' : 'Opciones Rápidas'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[10.5px] font-bold text-brand-rose hover:text-brand-rose/90 flex items-center gap-1 bg-brand-rose/10 px-2 py-1 rounded-md transition cursor-pointer"
                        title="Administrar categorías"
                      >
                        <Tag className="h-3 w-3" />
                        <span>Categorías</span>
                      </button>

                      {catalogMedications.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="font-semibold text-[10.5px] hidden sm:inline">⚡ Catálogo:</span>
                          <select 
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                const found = catalogMedications.find(m => m.id === val);
                                if (found) {
                                  setMedForm({
                                    genericName: found.genericName || found.name || '',
                                    commercialName: found.commercialName || '',
                                    concentration: found.concentration || found.dose || '',
                                    pharmaceuticalForm: found.pharmaceuticalForm || 'Crema',
                                    quantity: found.quantity || '1 tubo',
                                    baseInstruction: found.baseInstruction || 'Capa fina sobre las lesiones',
                                    route: found.route || 'Tópica',
                                    frequency: found.frequency || '2 veces al día',
                                    applicationSite: found.applicationSite || 'Lesiones de brazo',
                                    treatmentPeriod: found.treatmentPeriod || found.duration || '3 semanas',
                                    customNotes: found.customNotes || found.notes || ''
                                  });
                                }
                              }
                              e.target.value = "";
                            }}
                            className="text-[11px] px-2 py-1 bg-brand-linen/30 border border-brand-border rounded-lg outline-none cursor-pointer max-w-[200px] font-medium"
                          >
                            <option value="">-- Cargar medicamento --</option>
                            {catalogMedications.map(m => (
                              <option key={m.id} value={m.id}>[{m.category.substring(0, 7)}.] {m.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. DATOS DEL MEDICAMENTO */}
                  <div className="space-y-3">
                    <span className="block text-[10px] font-black text-brand-rose uppercase tracking-widest">
                      1. Datos del Medicamento
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre genérico *</label>
                        <input 
                          type="text"
                          value={medForm.genericName}
                          onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
                          placeholder="Ej. Clobetasol"
                          className="w-full px-3 py-1.5 border border-brand-border rounded-lg text-xs focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose outline-none bg-brand-linen/10 font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nombre comercial <span className="text-[10px] font-normal text-slate-400">(Opcional)</span></label>
                        <input 
                          type="text"
                          value={medForm.commercialName}
                          onChange={(e) => setMedForm({ ...medForm, commercialName: e.target.value })}
                          placeholder="Ej. Clopicar"
                          className="w-full px-3 py-1.5 border border-brand-border rounded-lg text-xs focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose outline-none bg-brand-linen/10 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Concentración / presentación</label>
                        <input 
                          type="text"
                          value={medForm.concentration}
                          onChange={(e) => setMedForm({ ...medForm, concentration: e.target.value })}
                          placeholder="Ej. 0,05% — tubo de 25 g"
                          className="w-full px-3 py-2 border border-brand-border rounded-xl text-xs focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose outline-none bg-brand-linen/10 font-medium"
                        />
                      </div>

                      <FloatingOptionsInput
                        label="Forma farmacéutica"
                        value={medForm.pharmaceuticalForm}
                        onChange={(val) => setMedForm({ ...medForm, pharmaceuticalForm: val })}
                        group="forms"
                        options={presets.forms}
                        placeholder="Ej. Crema"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />

                      <FloatingOptionsInput
                        label="Cantidad"
                        value={medForm.quantity}
                        onChange={(val) => setMedForm({ ...medForm, quantity: val })}
                        group="quantities"
                        options={presets.quantities}
                        placeholder="Ej. 1 tubo"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />
                    </div>
                  </div>

                  {/* 2. INDICACIONES EN ESTE ORDEN */}
                  <div className="space-y-3 pt-3 border-t border-brand-border/60">
                    <span className="block text-[10px] font-black text-brand-rose uppercase tracking-widest">
                      2. Indicaciones
                    </span>

                    <FloatingOptionsInput
                      label="Indicación base / Instrucción"
                      value={medForm.baseInstruction}
                      onChange={(val) => setMedForm({ ...medForm, baseInstruction: val })}
                      group="baseInstructions"
                      options={presets.baseInstructions}
                      placeholder='Ej. "Capa fina sobre las lesiones"'
                      onAddOption={handleAddOption}
                      onRemoveOption={handleRemoveOption}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingOptionsInput
                        label="Vía de administración"
                        value={medForm.route}
                        onChange={(val) => setMedForm({ ...medForm, route: val })}
                        group="routes"
                        options={presets.routes || DEFAULT_PRESETS.routes || []}
                        placeholder="Ej. Tópica / Oral"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />

                      <FloatingOptionsInput
                        label="Frecuencia"
                        value={medForm.frequency}
                        onChange={(val) => setMedForm({ ...medForm, frequency: val })}
                        group="frequencies"
                        options={presets.frequencies}
                        placeholder="Ej. 2 veces al día"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <FloatingOptionsInput
                        label="Lugar de aplicación"
                        value={medForm.applicationSite}
                        onChange={(val) => setMedForm({ ...medForm, applicationSite: val })}
                        group="applicationSites"
                        options={presets.applicationSites}
                        placeholder="Ej. Lesiones de brazo / Cara"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />

                      <FloatingOptionsInput
                        label="Período de tratamiento"
                        value={medForm.treatmentPeriod}
                        onChange={(val) => setMedForm({ ...medForm, treatmentPeriod: val })}
                        group="treatmentPeriods"
                        options={presets.treatmentPeriods}
                        placeholder="Ej. 3 semanas / 1 mes"
                        onAddOption={handleAddOption}
                        onRemoveOption={handleRemoveOption}
                      />
                    </div>
                  </div>

                  {/* 3. VISTA PREVIA EN TIEMPO REAL */}
                  {(() => {
                    const line1Preview = formatMedicationLine1(medForm, prescriptionForm.medications.length);
                    const line2Preview = formatMedicationLine2(medForm);

                    return (
                      <div className="bg-[#fbf5f4] border border-[#ead5d0] rounded-xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#b57367] uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" />
                            Vista Previa en Hoja de Receta
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Formato oficial</span>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-[#ead5d0]/70 space-y-1.5 shadow-2xs text-left">
                          <div className="font-bold text-slate-900 text-xs sm:text-[13.5px]">
                            {line1Preview || (prescriptionForm.medications.length + 1) + ". [Nombre del medicamento]"}
                          </div>
                          <div className="text-slate-700 text-xs sm:text-[12.5px] pl-3 leading-relaxed">
                            {line2Preview || "Complete las indicaciones arriba para ver la posología estructurada..."}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                    <input 
                      type="text"
                      value={medForm.customNotes}
                      onChange={(e) => setMedForm({ ...medForm, customNotes: e.target.value })}
                      placeholder="Observaciones extra (opcional)"
                      className="px-3 py-2 sm:py-1.5 border border-brand-border rounded-lg text-xs focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose outline-none flex-1 bg-brand-linen/10"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button 
                        type="button"
                        onClick={handleSaveCurrentBuilderToCatalog}
                        className="px-3 py-2.5 sm:py-2 bg-brand-linen hover:bg-brand-rose/10 text-brand-rose border border-brand-rose/30 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                        title="Guardar esta fórmula permanentemente en el Catálogo para usarla en futuras recetas"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Guardar en Catálogo</span>
                      </button>
                      <button 
                        type="button"
                        onClick={addMedicationItem}
                        className="px-4 py-2.5 sm:py-2 bg-brand-rose hover:bg-brand-rose/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Agregar al Listado</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Non-pharmacological recommendations */}
              <div>
                <label className="block text-xs font-bold text-black/90 uppercase tracking-wider mb-1">Indicaciones Generales y Cuidados</label>
                <textarea 
                  value={prescriptionForm.instructions}
                  onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                  placeholder="Reposo absoluto, abundantes líquidos, evitar grasas y picantes. Acudir a urgencias en caso de fiebre..."
                  rows={3}
                  className="w-full px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs transition bg-brand-linen/10"
                />
              </div>
            </div>

            {/* Bottom Actions footer bar */}
            <div className="p-4 sm:p-6 bg-white sm:bg-brand-linen/20 border-t border-brand-border flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-2 shrink-0 shadow-lg sm:shadow-none">
              <button 
                type="button"
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-white border border-brand-border hover:bg-brand-linen text-brand-charcoal text-sm font-semibold rounded-xl transition cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleCreatePrescription}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-brand-rose hover:bg-brand-rose/90 text-white text-sm font-semibold rounded-xl transition shadow-md shadow-brand-rose/10 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Guardar Receta y Sincronizar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADMINISTRAR CATEGORÍAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-brand-border shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-5 bg-brand-linen/40 border-b border-brand-border flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-brand-rose">
                <Tag className="h-5 w-5" />
                <div>
                  <h3 className="font-bold text-brand-charcoal text-base">Administrar Categorías</h3>
                  <p className="text-[11px] text-slate-500">Agrega, modifica o elimina categorías de medicamentos</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryIndex(null);
                  setNewCategoryName('');
                }}
                className="text-slate-400 hover:text-brand-rose font-bold text-lg px-2 cursor-pointer transition"
              >
                ×
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {/* Form: Add New Category */}
              <div className="bg-brand-linen/20 p-3.5 rounded-xl border border-brand-border space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Agregar Nueva Categoría
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategory(newCategoryName);
                      }
                    }}
                    placeholder="Ej. Fotoprotectores, Suplementos..."
                    className="flex-1 px-3 py-2 border border-brand-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose text-xs bg-white font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCategory(newCategoryName)}
                    className="px-3.5 py-2 bg-brand-rose hover:bg-brand-rose/90 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm cursor-pointer shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar</span>
                  </button>
                </div>
              </div>

              {/* List: Existing Categories with Edit / Delete */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Categorías Actuales ({presets.categories.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Modifica o elimina</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {presets.categories.map((cat, idx) => {
                    const isEditing = editingCategoryIndex === idx;
                    const countInCat = catalogMedications.filter(m => m.category === cat).length;

                    return (
                      <div
                        key={cat + idx}
                        className="p-2.5 rounded-xl border border-brand-border bg-white flex items-center justify-between gap-2 hover:border-brand-rose/40 transition shadow-2xs"
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingCategoryName}
                              onChange={(e) => setEditingCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleUpdateCategory(idx, editingCategoryName);
                                } else if (e.key === 'Escape') {
                                  setEditingCategoryIndex(null);
                                }
                              }}
                              autoFocus
                              className="flex-1 px-2.5 py-1 text-xs border border-brand-rose rounded-lg bg-brand-linen/10 font-medium outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateCategory(idx, editingCategoryName)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              title="Guardar cambios"
                            >
                              <span>Guardar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCategoryIndex(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                              title="Cancelar edición"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full bg-brand-rose shrink-0" />
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {cat}
                              </span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-brand-linen/50 text-slate-500 border border-brand-border font-medium shrink-0">
                                {countInCat} {countInCat === 1 ? 'medicamento' : 'medicamentos'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategoryIndex(idx);
                                  setEditingCategoryName(cat);
                                }}
                                className="p-1.5 text-slate-500 hover:text-brand-rose hover:bg-brand-linen/40 rounded-lg border border-transparent hover:border-brand-border transition cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                                title="Modificar nombre de categoría"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Modificar</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(idx)}
                                disabled={presets.categories.length <= 1}
                                className={`p-1.5 rounded-lg border border-transparent transition cursor-pointer flex items-center gap-1 text-[11px] font-medium ${
                                  presets.categories.length <= 1
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-red-600 hover:bg-red-50 hover:border-red-100'
                                }`}
                                title={
                                  presets.categories.length <= 1
                                    ? 'No puedes eliminar la única categoría disponible'
                                    : 'Eliminar categoría'
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Quitar</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-brand-linen/40 border-t border-brand-border flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategoryIndex(null);
                  setNewCategoryName('');
                }}
                className="px-5 py-2 bg-brand-rose hover:bg-brand-rose/90 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
