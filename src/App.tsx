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
import { toJpeg, toPng } from 'html-to-image';
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

  // Catalog medication search in prescription modal
  const [modalCatalogSearch, setModalCatalogSearch] = useState('');
  const [isModalCatalogDropdownOpen, setIsModalCatalogDropdownOpen] = useState(false);
  const modalCatalogSearchRef = useRef<HTMLDivElement>(null);

  // Close modal catalog dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalCatalogSearchRef.current && !modalCatalogSearchRef.current.contains(event.target as Node)) {
        setIsModalCatalogDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isPrescriptionModalOpen) {
      setModalCatalogSearch('');
      setIsModalCatalogDropdownOpen(false);
    }
  }, [isPrescriptionModalOpen]);

  const filteredModalCatalogMeds = useMemo(() => {
    const q = modalCatalogSearch.trim().toLowerCase();
    if (!q) {
      return catalogMedications;
    }
    return catalogMedications.filter(m => {
      const generic = (m.genericName || m.name || '').toLowerCase();
      const commercial = (m.commercialName || '').toLowerCase();
      return generic.includes(q) || commercial.includes(q);
    });
  }, [catalogMedications, modalCatalogSearch]);

  function handleSelectModalCatalogMed(found: CatalogMedication) {
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
    setModalCatalogSearch('');
    setIsModalCatalogDropdownOpen(false);
  }

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

  // Helper for wrapping text in SVG prescription items
  function wrapSvgText(text: string, maxChars: number = 65): string[] {
    if (!text) return [];
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + (currentLine ? ' ' : '') + word).length <= maxChars) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Direct PDF Download formatted strictly for 21x28 cm sheet using the exact vector SVG template
  const handleDownloadPdf = async () => {
    if (!selectedPrescription) return;
    setIsDownloadingPdf(true);
    try {
      const svgEl = printAreaRef.current?.querySelector('svg#prescription-svg-doc');
      if (!svgEl) {
        throw new Error('No se encontró el elemento SVG de la receta');
      }

      // Clone SVG to set explicit width/height in points for rasterization
      const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
      svgClone.setAttribute('width', '595.28');
      svgClone.setAttribute('height', '793.7');
      const svgString = new XMLSerializer().serializeToString(svgClone);

      // Convert SVG to ultra-high-resolution PNG (3x scaling: 1786 x 2381 px)
      const pngDataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 1786;
          canvas.height = 2381;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context no disponible'));
            return;
          }
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error('Error al rasterizar el SVG'));
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      });

      // Exact 21x28 cm sheet size: 595.28 pt x 793.7 pt
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: [595.28, 793.7],
      });

      pdf.addImage(pngDataUrl, 'PNG', 0, 0, 595.28, 793.7);

      // Save PDF
      const patientSlug = (selectedPrescription.patientName || 'Paciente')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      const dateSlug = (selectedPrescription.createdAt || new Date().toISOString()).split('T')[0];
      const filename = `Receta_${patientSlug}_${dateSlug}.pdf`;

      try {
        pdf.save(filename);
      } catch (saveErr) {
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
                      {/* MEDICAL PRESCRIPTION SHEET (PERFECT 21x28 CM RENDER FOR SCREEN AND PRINT) */}
                      {(() => {
                        const selPatient = selectedPrescription 
                          ? patients.find(p => p.id === selectedPrescription.patientId || `${p.name} ${p.lastName}`.trim().toLowerCase() === selectedPrescription.patientName.trim().toLowerCase()) 
                          : null;
                        let ageDisplay = '';
                        if (selPatient?.dob) {
                          const birthDate = new Date(selPatient.dob);
                          const today = new Date();
                          let calculatedAge = today.getFullYear() - birthDate.getFullYear();
                          const m = today.getMonth() - birthDate.getMonth();
                          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                            calculatedAge--;
                          }
                          if (!isNaN(calculatedAge) && calculatedAge >= 0) {
                            ageDisplay = `${calculatedAge} años`;
                          }
                        }

                        let parsedMeds: MedicationItem[] = [];
                        try {
                          parsedMeds = JSON.parse(selectedPrescription.medications) || [];
                        } catch (e) {
                          parsedMeds = [];
                        }

                        const dateFormatted = new Date(selectedPrescription.createdAt).toLocaleDateString() + ' ' + new Date(selectedPrescription.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                        const headerClinicName = selectedPrescription.clinicName || doctorProfile?.clinicName || 'Centro Médico Niño Jesús';
                        const headerPhone = doctorProfile?.phone ? (doctorProfile.phone.startsWith('+') ? doctorProfile.phone : '+591 ' + doctorProfile.phone) : '+591 73887070';
                        const headerLicense = selectedPrescription.doctorLicense || doctorProfile?.licenseId || 'T-1657';

                        const rawAddr = doctorProfile?.address?.trim();
                        let headerAddrLines: string[] = [];
                        if (rawAddr) {
                          if (rawAddr.includes('\n')) {
                            headerAddrLines = rawAddr.split('\n').map(s => s.trim()).filter(Boolean);
                          } else {
                            headerAddrLines = wrapSvgText(rawAddr, 38);
                          }
                        } else {
                          headerAddrLines = ['Piso 5 - Consultorio 512', '(Av. Cañoto esquina Rafael Peña)'];
                        }

                        return (
                          <div 
                            ref={printAreaRef}
                            className="bg-white rounded-2xl border border-brand-border shadow-lg relative overflow-hidden select-none max-w-[650px] mx-auto p-0 print:border-none print:shadow-none print:rounded-none print:max-w-none"
                            id="printable-prescription"
                            style={{
                              backgroundColor: "#ffffff",
                              aspectRatio: "595.28 / 793.7",
                              width: "100%"
                            }}
                          >
                            <svg 
                              id="prescription-svg-doc" 
                              data-name="Capa 1" 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 595.28 793.7"
                              className="w-full h-auto block"
                            >
                              <defs>
                                <style>{`
                                  .cls-1,.cls-16{fill:#fff;}
                                  .cls-2{fill:#545556;}
                                  .cls-3{fill:#dc968b;}
                                  .cls-4{fill:#f8e4df;}
                                  .cls-19,.cls-20,.cls-5{fill:#454548;}
                                  .cls-15,.cls-6{fill:#bf815e;}
                                  .cls-7{fill:#c89582;}
                                  .cls-17,.cls-8{fill:none;stroke-miterlimit:10;}
                                  .cls-8{stroke:#b2b1b2;}
                                  .cls-9{font-size:9px;}
                                  .cls-10,.cls-11,.cls-9{fill:#1e293b;}
                                  .cls-18,.cls-20,.cls-9{font-family:Arial, Helvetica, sans-serif;}
                                  .cls-10,.cls-15{font-size:11px;}
                                  .cls-10,.cls-11,.cls-15,.cls-16,.cls-19{font-family:Arial, Helvetica, sans-serif;font-weight:700;}
                                  .cls-11{font-size:10px;}
                                  .cls-12{opacity:0.4;}
                                  .cls-13{fill:#faf0ee;}
                                  .cls-14{fill:#faecea;}
                                  .cls-16,.cls-18{font-size:8px;}
                                  .cls-17{stroke:#cdd6e0;stroke-width:1.13px;}
                                  .cls-18{fill:#95a3b8;}
                                  .cls-19{font-size:12.51px;}
                                  .cls-20{font-size:11.26px;}
                                `}</style>
                              </defs>

                              {/* 1. Base Sheet White Background */}
                              <rect className="cls-1" x="0.86" y="-0.49" width="595.28" height="793.7"/>

                              {/* 2. Top-Right Dark Grey Bar */}
                              <rect className="cls-2" x="297.64" y="-5.51" width="303.31" height="19.68"/>

                              {/* 3. Bottom Pink Bar */}
                              <rect className="cls-3" x="-6.63" y="754" width="607.57" height="45.21"/>

                              {/* 4. Top-Left Soft Pink Curved Accent */}
                              <path className="cls-4" d="M238.72,119.83H-5.67V-5.51H339L285.82,91.88A53.68,53.68,0,0,1,238.72,119.83Z"/>

                              {/* 5. Logo Vector Silhouette on Top-Left */}
                              <g id="Capa_2" data-name="Capa 2">
                                <g id="Capa_1-2" data-name="Capa 1-2">
                                  <g id="Capa_2-2" data-name="Capa 2-2">
                                    <g id="Capa_1-2-2" data-name="Capa 1-2-2">
                                      <path className="cls-5" d="M54.09,101.57A40.78,40.78,0,0,1,25.92,89,43.6,43.6,0,0,1,21,82.69a40.1,40.1,0,0,1-3.54-7.09A41.31,41.31,0,0,1,40.76,22.16a42.05,42.05,0,0,1,16.11-2.89A41.49,41.49,0,0,1,94.11,46.86a41,41,0,0,1-40,54.69m0-.33a40,40,0,0,0,7.8-.52,39,39,0,0,0,9.42-74.25,37.76,37.76,0,0,0-7.1-2.31,40,40,0,0,0-7.48-.92A38,38,0,0,0,42,25.39a39,39,0,0,0-3.55,72,39.84,39.84,0,0,0,15.68,3.86"/>
                                      <path className="cls-6" d="M16.34,99.74a1.89,1.89,0,0,0,.53-.21l.48-.28a7.7,7.7,0,0,0,.89-.6,19.84,19.84,0,0,0,1.68-1.35,28.26,28.26,0,0,0,2.88-2.91A30.65,30.65,0,0,0,27,88.13c.55-1.08,1.05-2.18,1.49-3.31a16.09,16.09,0,0,0,.6-1.78l.29-.87c.1-.3.19-.6.3-.92.78-2.52,1.58-5.32,2.46-8S34,67.8,35.17,65a58.81,58.81,0,0,1,4.22-8,37.74,37.74,0,0,1,2.7-3.83,30.25,30.25,0,0,1,3.24-3.55,19.39,19.39,0,0,1,3.94-2.85,11,11,0,0,1,4.57-1.44A20.1,20.1,0,0,0,51.48,49,36.43,36.43,0,0,0,50,52.85c-.9,2.55-1.63,5.16-2.34,7.82-1.42,5.32-2.77,10.64-4.54,16.2-.21.69-.44,1.39-.67,2.1S42,80.35,41.73,81s-.55,1.4-.81,2.11-.61,1.42-.93,2.13c-.17.35-.33.72-.51,1.08l-.14.26-.14.31c-.09.19-.2.37-.3.56s-.41.73-.63,1.1-.44.73-.67,1.08a27.12,27.12,0,0,1-3.21,4,23.35,23.35,0,0,1-8.31,5.55,18.37,18.37,0,0,1-4.79,1.13,14.09,14.09,0,0,1-2.43,0,8.35,8.35,0,0,1-1.22-.18,3,3,0,0,1-.59-.15,1.54,1.54,0,0,1-.71-.24"/>
                                      <path className="cls-3" d="M56.31,75.22a4.2,4.2,0,0,0,.49-.37l.46-.37.89-.78c.57-.53,1.12-1.08,1.65-1.61,1.05-1.1,2-2.2,2.94-3.34a23.82,23.82,0,0,0,2.41-3.63,38,38,0,0,0,1.78-3.9c.51-1.33,1-2.68,1.43-4l.32-.94.3-.91.62-2c.43-1.33.89-2.73,1.39-4.14s1-2.88,1.57-4.35c1.1-2.92,2.31-5.88,3.75-8.86a56.68,56.68,0,0,1,5-8.57,43.08,43.08,0,0,1,3.23-3.92,30.77,30.77,0,0,1,3.83-3.38,20.49,20.49,0,0,1,9-4.08,33.34,33.34,0,0,0-5.59,7.25,52.1,52.1,0,0,0-3.54,7.93c-1,2.73-1.78,5.53-2.63,8.4s-1.58,5.76-2.39,8.74a59.89,59.89,0,0,1-3.14,9.12A25.78,25.78,0,0,1,79,59.91c-.23.4-.46.79-.71,1.18s-.24.43-.37.61l-.39.53a32.33,32.33,0,0,1-3.46,3.93,45.5,45.5,0,0,1-3.93,3.41c-1.37,1-2.79,2-4.24,2.89a21.54,21.54,0,0,1-4.57,2.18,18,18,0,0,1-2.42.53c-.42,0-.83.11-1.25.13a6.84,6.84,0,0,1-1.28,0"/>
                                      <path className="cls-7" d="M42.6,78.19a1.93,1.93,0,0,1,.48,0h.48l.92.1a8.43,8.43,0,0,1,1.77.36,24.88,24.88,0,0,1,3.3,1.06,27.11,27.11,0,0,1,5.62,3.07c.83.6,1.63,1.24,2.41,1.91l1.12,1,.55.53.6.6c1.58,1.6,3.25,3.34,5,5s3.55,3.38,5.54,5a50.76,50.76,0,0,0,6.25,4.47,33.54,33.54,0,0,0,3.55,1.77A27.28,27.28,0,0,0,84,104.5a17.07,17.07,0,0,0,4.08.62,9.57,9.57,0,0,0,4-.75,17,17,0,0,1-3.21-1.77,30.16,30.16,0,0,1-2.68-2.23,64.8,64.8,0,0,1-4.84-5C78.2,92,75.06,88.43,71.57,85c-.42-.44-.88-.87-1.33-1.29s-.9-.85-1.36-1.28-1-.85-1.46-1.26-1-.85-1.43-1.2l-.82-.6L65,79.2l-.22-.15-.55-.37-.9-.6c-.3-.2-.62-.37-.92-.53a22,22,0,0,0-4-1.78,19.93,19.93,0,0,0-8.4-.88,15.58,15.58,0,0,0-4,1,11.11,11.11,0,0,0-1.78.92,7,7,0,0,0-.83.6,3.33,3.33,0,0,0-.39.36,1.68,1.68,0,0,0-.3.4"/>
                                      <path className="cls-5" d="M124.19,59.83l-1-1.61q-3.4-5.31-5.52-8.37a34.45,34.45,0,0,1-4,1.94v8.06h-3V39.64h3V49.89a18.88,18.88,0,0,0,6.24-4.24,11.37,11.37,0,0,0,3.14-6h3.19a11.94,11.94,0,0,1-2.08,4.62A18.6,18.6,0,0,1,120,48.4c1.19,1.77,2.43,3.69,3.7,5.53s2.68,3.81,4.17,5.9Z"/>
                                      <path className="cls-5" d="M144.53,48.86q3.93,9,4.91,11h-3.67c-.62-1.54-1.22-3-1.77-4.52l-.32-.82h-9c-.8,2-1.49,3.8-2,5.32h-2.71L131.13,57q.63-1.53,2.87-6.8T137.86,41a.74.74,0,0,1-.51-.42,1.24,1.24,0,0,1-.14-.82H140c.34,0,.57.11.66.32ZM143,52.55l-1.63-4-.89-2.29c-.55-1.3-1-2.36-1.22-3.19-.55,1.63-1.44,3.9-2.66,6.84-.71,1.78-1.06,2.61-1.08,2.66Z"/>
                                      <path className="cls-5" d="M164,59.87c-.16-.34-.84-1.51-2-3.55s-2-3.22-2.46-3.9h-5v7.41h-3V39.71h6.68a11.77,11.77,0,0,1,4.58.83,6.3,6.3,0,0,1,2.83,2.19,6.62,6.62,0,0,1-.1,7.09A6.33,6.33,0,0,1,162.33,52c.73,1.19,1.77,2.75,2.87,4.65A32.45,32.45,0,0,0,167.37,60Zm-5.75-9.31a6.2,6.2,0,0,0,3.87-1.06,3.71,3.71,0,0,0,1.36-3.12,4.23,4.23,0,0,0-1.42-3.55A6.41,6.41,0,0,0,158,41.64h-2.13a2.53,2.53,0,0,0-1,.13.55.55,0,0,0-.35.46v8a8.43,8.43,0,0,0,2.29.26Z"/>
                                      <path className="cls-5" d="M173.63,58.81a10.08,10.08,0,0,1-3.75-3.67,10.44,10.44,0,0,1-1.36-5.32,10.86,10.86,0,0,1,1.33-5.32,9.5,9.5,0,0,1,3.69-3.67,10.88,10.88,0,0,1,10.39,0,9.7,9.7,0,0,1,3.72,3.72,11.27,11.27,0,0,1,0,10.64A9.66,9.66,0,0,1,184,58.91a10.73,10.73,0,0,1-10.45,0m8.87-1.49a6.53,6.53,0,0,0,2.41-2.64,8.42,8.42,0,0,0,.85-3.88,12.22,12.22,0,0,0-.92-4.89,8,8,0,0,0-2.55-3.39,6.27,6.27,0,0,0-3.76-1.21,6.81,6.81,0,0,0-3.55.93,6.36,6.36,0,0,0-2.43,2.58,8.18,8.18,0,0,0-.87,3.73,13,13,0,0,0,.93,5,8.24,8.24,0,0,0,2.58,3.45,6,6,0,0,0,3.76,1.26,6.53,6.53,0,0,0,3.55-1"/>
                                      <path className="cls-5" d="M191.43,59.85V39.64h3V57.58a9.34,9.34,0,0,0,2.11.22c4.29,0,6.81,0,7.59-.11v2.07Z"/>
                                      <path className="cls-5" d="M125.74,67.21h-6.07V85.44h-3V67.23c-2,0-4,0-6,.09V65.19h15.07Z"/>
                                      <path className="cls-5" d="M137.3,74.32q3.91,9,4.93,11h-3.69c-.64-1.53-1.23-3-1.78-4.52l-.31-.8h-9c-.8,2-1.49,3.79-2,5.32h-2.7l1.21-2.82,2.87-6.79q2.23-5.33,3.85-9.31a.79.79,0,0,1-.53-.43,1.42,1.42,0,0,1-.15-.81h2.81c.33,0,.56.1.65.32ZM135.74,78l-1.63-4-1-2.31a31.22,31.22,0,0,1-1.22-3.19c-.55,1.62-1.44,3.9-2.65,6.85L128.17,78Z"/>
                                      <path className="cls-5" d="M144.67,85.28V65.14h3V83a8.86,8.86,0,0,0,2.11.23c4.28,0,6.81,0,7.57-.12v2.13Z"/>
                                      <path className="cls-5" d="M174.14,74.36q3.93,9,4.89,11h-3.58c-.64-1.55-1.22-3.05-1.77-4.53l-.32-.88h-9c-.81,2-1.48,3.79-2,5.32h-2.68l1.2-2.82q.65-1.54,2.88-6.81t3.84-9.29a.86.86,0,0,1-.53-.44,1.48,1.48,0,0,1-.14-.8h2.8a.61.61,0,0,1,.66.32ZM172.6,78l-1.65-4a16.71,16.71,0,0,0-1-2.32c-.55-1.3-.89-2.43-1.17-3.17-.57,1.61-1.44,3.88-2.66,6.82-.71,1.77-1.06,2.61-1.08,2.66Z"/>
                                      <path className="cls-5" d="M179.85,65.19l1.77,4.63,4.68,11.91c1-2.82,2.27-6,3.55-9.45,1.51-3.9,2.41-6.24,2.71-7.09h2.86c-.55,1.1-1.64,3.55-3.23,7.39s-3.28,8.11-5.05,12.79h-2.22q-2-4.92-5-11.88t-3.69-8.34Z"/>
                                      <path className="cls-5" d="M207.35,83.33a23.65,23.65,0,0,0,3.37-.11v2.06H197.29V65.12h13v2.11c-1.95,0-5-.13-9.19-.13-.46,0-.71.13-.78.38v6.43h1.4c1.44,0,3.65,0,6.6-.12V76h-8v7.2a9.49,9.49,0,0,0,2.38.19h4.68"/>
                                      <path className="cls-5" d="M225.56,85.37c-.16-.36-.84-1.51-2-3.55s-2-3.28-2.45-3.95h-5v7.41h-2.92V65.17h6.57a11.94,11.94,0,0,1,4.58.82,6.47,6.47,0,0,1,2.87,2.3,5.76,5.76,0,0,1,1,3.39,5.6,5.6,0,0,1-1.08,3.54,6.17,6.17,0,0,1-3.13,2.15L226.78,82c1.19,1.89,1.91,3,2.18,3.37Zm-5.73-9.31a6.29,6.29,0,0,0,3.86-1A3.7,3.7,0,0,0,225,71.89a4.22,4.22,0,0,0-1.42-3.46,6.25,6.25,0,0,0-4.07-1.2H217.4a3.15,3.15,0,0,0-1,.12.52.52,0,0,0-.34.46v8a7.89,7.89,0,0,0,2.27.27Z"/>
                                      <path className="cls-5" d="M245.66,74.36q3.92,9,4.9,11h-3.73c-.64-1.55-1.24-3.05-1.77-4.53l-.32-.81h-9c-.8,2-1.49,3.79-2,5.32h-2.66l1.23-2.82c.4-1,1.36-3.3,2.85-6.81s2.77-6.61,3.85-9.29a.82.82,0,0,1-.52-.44,1.18,1.18,0,0,1-.14-.8h2.79a.63.63,0,0,1,.67.32ZM244.1,78l-1.65-4c-.09-.25-.4-1-.95-2.32s-1-2.36-1.23-3.17q-.83,2.42-2.64,6.82l-1.1,2.66Z"/>
                                      <path className="cls-5" d="M116.32,92.85a3.55,3.55,0,0,1-3.41,3.68h-2.19a.14.14,0,0,1-.14-.14h0v-7.1a.12.12,0,0,1,.08-.15h1.81a3.55,3.55,0,0,1,3.84,3.23A2.79,2.79,0,0,1,116.32,92.85Zm-1,0a2.54,2.54,0,0,0-2.25-2.79,2.91,2.91,0,0,0-.59,0h-.94v5.57h.94a2.53,2.53,0,0,0,2.83-2.2A2.25,2.25,0,0,0,115.33,92.85Z"/>
                                      <path className="cls-5" d="M124.6,95.79v.57a.14.14,0,0,1-.12.16H120a.16.16,0,0,1-.16-.14h0v-7.1a.16.16,0,0,1,.14-.16h4.56a.17.17,0,0,1,.16.15h0v.58a.15.15,0,0,1-.15.14h-3.72v2.18h3.37a.16.16,0,0,1,.16.15h0v.56a.15.15,0,0,1-.14.16h-3.39v2.49h3.71a.16.16,0,0,1,.16.15h0Z"/>
                                      <path className="cls-5" d="M133.56,96.34c0,.11,0,.18-.13.18h-.69a.21.21,0,0,1-.18-.11l-1.36-2.62h-1.92v2.57a.16.16,0,0,1-.14.16h-.69a.16.16,0,0,1-.16-.14h0v-7.1a.14.14,0,0,1,.12-.15h2.65c1.93,0,2.64.82,2.64,2.31a2,2,0,0,1-1.56,2.2Zm-4.28-3.44h1.78c1,0,1.63-.26,1.63-1.42s-.66-1.42-1.63-1.42h-1.78Z"/>
                                      <path className="cls-5" d="M144.65,89.34v7.09a.15.15,0,0,1-.14.16h-.69a.16.16,0,0,1-.16-.14h0V91.13l-2.23,5.32a.2.2,0,0,1-.18.12h-.66a.14.14,0,0,1-.17-.1v0l-2.24-5.32v5.32a.16.16,0,0,1-.14.16h-.69a.16.16,0,0,1-.16-.15h0V89.37a.16.16,0,0,1,.14-.16h.85a.21.21,0,0,1,.2.11l2.53,6.13,2.54-6.13a.2.2,0,0,1,.19-.11h.85a.15.15,0,0,1,.16.15Z"/>
                                      <path className="cls-5" d="M154.28,96.52h-.69a.19.19,0,0,1-.18-.13L152.9,95h-3.35L149,96.39a.23.23,0,0,1-.18.15h-.67a.13.13,0,0,1-.13-.2l2.66-7.09a.22.22,0,0,1,.2-.14h.65a.22.22,0,0,1,.2.14l2.67,7.09a.13.13,0,0,1-.1.17Zm-1.77-2.4-1.37-3.72-1.29,3.74Z"/>
                                      <path className="cls-5" d="M162.31,89.34v.58a.14.14,0,0,1-.14.14H160v6.3a.17.17,0,0,1-.15.16h-.69a.16.16,0,0,1-.16-.14h0V90.06h-2.2s-.14,0-.16-.12h0v-.58a.16.16,0,0,1,.15-.16h5.32a.15.15,0,0,1,.15.14Z"/>
                                      <path className="cls-5" d="M165.27,92.88A3.76,3.76,0,1,1,169,96.66a3.77,3.77,0,0,1-3.76-3.78Zm6.55,0A2.8,2.8,0,1,0,169,95.74a2.8,2.8,0,0,0,2.79-2.86Z"/>
                                      <path className="cls-5" d="M181.13,95.79v.57a.15.15,0,0,1-.13.16h-4.47a.15.15,0,0,1-.16-.12v0h0v-7.1a.14.14,0,0,1,.13-.15h.69a.15.15,0,0,1,.16.13v0h0v6.29h3.54s.15,0,.16.12Z"/>
                                      <path className="cls-5" d="M184.16,92.88a3.76,3.76,0,1,1,3.76,3.78,3.76,3.76,0,0,1-3.76-3.78Zm6.54,0a2.82,2.82,0,1,0,0,.08v-.08Zm-1.77-5.72-.61,1.31a.17.17,0,0,1-.17.14h-.5c-.12,0-.18,0-.12-.18l.62-1.33a.21.21,0,0,1,.17,0h.52c.12,0,.17,0,.12.18Z"/>
                                      <path className="cls-5" d="M202.21,92.81v.41a3.24,3.24,0,0,1-3,3.44h-.34a3.79,3.79,0,0,1,0-7.57,3.51,3.51,0,0,1,2.49,1v.19h0l-.42.45h-.2A2.74,2.74,0,0,0,199,90a2.83,2.83,0,0,0,0,5.65,2.23,2.23,0,0,0,2.41-2V93.5H199s-.14,0-.16-.12h0v-.57a.16.16,0,0,1,.14-.16h3.12a.15.15,0,0,1,.16.13h0Z"/>
                                      <path className="cls-5" d="M211.25,96.52h-.68a.15.15,0,0,1-.17-.13L209.9,95h-3.39L206,96.39a.2,2.2,0,0,1-.18.15h-.69a.14.14,0,0,1-.12-.2l2.67-7.09a.22.22,0,0,1,.2-.14h.66a.21.21,0,0,1,.19.14l2.68,7.09C211.37,96.45,211.37,96.52,211.25,96.52Zm-1.65-2.38-1.37-3.72-1.36,3.72Z"/>
                                      <path className="cls-5" d="M116,32.85a3.31,3.31,0,0,1-3,3.55h-2.27a.15.15,0,0,1-.15-.13h0V29.53a.15.15,0,0,1,.13-.14h1.77a3.3,3.3,0,0,1,3.54,3C116,32.57,116,32.71,116,32.85Zm-.94,0a2.42,2.42,0,0,0-2.27-2.55,3.12,3.12,0,0,0-.43,0h-.88v5.32h.88A2.4,2.4,0,0,0,115,33.54a2.53,2.53,0,0,0,0-.55Z"/>
                                      <path className="cls-5" d="M122.24,36.15c0,.1,0,.17-.1.17h-.66a.2.2,0,0,1-.18-.1L120,33.74h-1.78v2.44a.13.13,0,0,1-.12.14h-.73a.16.16,0,0,1-.16-.12h0V29.53a.15.15,0,0,1,.14-.14h2.51c1.77,0,2.48.76,2.48,2.17A1.89,1.89,0,0,1,121,33.65Zm-4-3.25H120c.93,0,1.53-.25,1.53-1.34S121,30.31,120,30.31h-1.78Z"/>
                                      <path className="cls-5" d="M129.16,36.32h-.64a.15.15,0,0,1-.16-.12l-.5-1.33h-3.17l-.5,1.33a.14.14,0,0,1-.17.12h-.64c-.11,0-.16,0-.13-.15l2.54-6.65a.17.17,0,0,1,.18-.13h.62a.17.17,0,0,1,.17.13l2.52,6.65S129.28,36.32,129.16,36.32Zm-1.6-2.26-1.29-3.55L125,34.06Z"/>
                                      <path className="cls-5" d="M130.33,35.76A.71.71,0,0,1,131,35a.7.7,0,0,1,.75.64v0m0,.09a.69.69,0,0,1-.63.74h0a.73.73,0,0,1-.76-.65Z"/>
                                    </g>
                                  </g>
                                </g>
                              </g>

                              {/* 6. Header Divider Line */}
                              <line className="cls-8" x1="14.17" y1="137.85" x2="581.1" y2="137.85"/>

                              {/* 7. Top-Right Rounded Pill Badge */}
                              <rect className="cls-3" x="556.33" y="-22" width="23.56" height="156" rx="11.78"/>

                              {/* Location Icon in Badge */}
                              <g id="Capa_2-2-2" data-name="Capa 2">
                                <g id="Capa_1-2-2-2" data-name="Capa 1-2">
                                  <path className="cls-1" d="M575.27,43.3a8.25,8.25,0,0,1-.84,3.48,24.4,24.4,0,0,1-3.13,5c-.64.81-1.29,1.58-1.92,2.36a1.58,1.58,0,0,1-1.2.73,1.19,1.19,0,0,1-.83-.24A8.52,8.52,0,0,1,566,53.17a39.14,39.14,0,0,1-3.62-5.06,13.87,13.87,0,0,1-1.15-2.51,6.21,6.21,0,0,1-.27-2.42,6.75,6.75,0,0,1,2.33-4.74,7.09,7.09,0,0,1,4.11-1.87,7.2,7.2,0,0,1,7.63,5.19,5.63,5.63,0,0,1,.14.69C575.24,42.81,575.26,43.13,575.27,43.3Zm-7.13-2.82a3.25,3.25,0,1,0,3.24,3.26,3.25,3.25,0,0,0-3.24-3.26Z"/>
                                </g>
                              </g>

                              {/* WhatsApp Icon in Badge */}
                              <g id="Capa_2-3" data-name="Capa 2">
                                <g id="Capa_1-2-3" data-name="Capa 1-2">
                                  <path className="cls-1" d="M567.52,72.69h1.23a3.78,3.78,0,0,1,.74.11A8,8,0,0,1,576,79.26c0,.28.09.56.13.84v1.17a4.88,4.88,0,0,1-.13.84,8,8,0,0,1-12.16,5.37.28.28,0,0,0-.28,0l-2.38.76-.56.18c.32-1,.64-1.93,1-2.81a.36.36,0,0,0,0-.32,7.92,7.92,0,0,1,1.14-10.51,7.7,7.7,0,0,1,4-1.92Zm-4,5.87a3.14,3.14,0,0,0,.21,1.13,7.14,7.14,0,0,0,1.05,1.76A9,9,0,0,0,569.6,85a3.06,3.06,0,0,0,1.67.14,1.92,1.92,0,0,0,1.67-2,.28.28,0,0,0-.2-.31l-1.81-.88a.47.47,0,0,0-.63.14l0,0c-.17.23-.33.46-.52.69a.49.49,0,0,1-.69.17h0a6.27,6.27,0,0,1-3.11-2.73.33.33,0,0,1,0-.47l.56-.66a.5.5,0,0,0,.09-.62c-.23-.53-.45-1.08-.67-1.61s-.25-.52-.77-.52a1.18,1.18,0,0,0-1,.34A2.55,2.55,0,0,0,563.47,78.56Z"/>
                                </g>
                              </g>

                              {/* Medical Caduceus Badge Icon */}
                              <path className="cls-1" d="M560.1,119.2a4,4,0,0,1,.22-.69,2.14,2.14,0,0,1,1.43-1.19c.1,0,.13-.06.13-.16,0-.31,0-.62,0-.93a2.55,2.55,0,0,1,5.1,0v3a1.57,1.57,0,1,0,3.14.12,1.53,1.53,0,0,0-.13-.7c-.38-.87-.74-1.74-1.11-2.61a.4.4,0,0,0-.12-.16,3.63,3.63,0,0,1-1.68-2.23c-.37-1.35-.77-2.69-1.14-4a1.91,1.91,0,0,1,1.86-2.42H568c0-.09,0-.16,0-.22a.47.47,0,0,1,.48-.38.44.44,0,0,1,.41.43c0,.41,0,.81,0,1.22a.44.44,0,0,1-.45.43.46.46,0,0,1-.44-.45v-.13a1,1,0,0,0-1.24,1.31q.57,2.1,1.2,4.2a2.67,2.67,0,0,0,2.59,1.88,2.73,2.73,0,0,0,2.57-2c.38-1.34.76-2.69,1.15-4a1,1,0,0,0-.68-1.34,3.06,3.06,0,0,0-.54-.07,1.42,1.42,0,0,0,0,.19.45.45,0,0,1-.89,0c0-.41,0-.81,0-1.22a.45.45,0,0,1,.89,0,.86.86,0,0,0,0,.16c.19,0,.38,0,.56,0a1.92,1.92,0,0,1,1.54,2.42c-.39,1.41-.79,2.82-1.21,4.23a3.42,3.42,0,0,1-1.55,2,.45.45,0,0,0-.18.21c-.38.88-.75,1.77-1.13,2.66a1.42,1.42,0,0,0-.12.54,2.4,2.4,0,0,1-1.49,2.3,4,4,0,0,1-.67.2h-.6l-.06,0a2.45,2.45,0,0,1-2.1-2.44v-3a1.66,1.66,0,0,0-3.29-.32c0,.39,0,.79,0,1.18,0,.1,0,.13.12.16a2.2,2.2,0,0,1,1.63,2.49,2.22,2.22,0,0,1-4.33.28c0-.11-.06-.22-.08-.32Zm3.55.27a1.33,1.33,0,1,0-1.33,1.33A1.34,1.34,0,0,0,563.65,119.47Zm7.5-3.13H570l.59,1.39Z"/>
                              <path className="cls-1" d="M562.76,119.47a.45.45,0,1,1-.43-.44A.43.43,0,0,1,562.76,119.47Z"/>

                              {/* Top-Right Contact Details (Cleanly right-aligned before the pill badge) */}
                              <text className="cls-11" textAnchor="end" x="546" y="38">
                                {headerClinicName}
                              </text>
                              {headerAddrLines.map((line, aIdx) => (
                                <text key={'addr-' + aIdx} className="cls-9" textAnchor="end" x="546" y={49 + aIdx * 11}>
                                  {line}
                                </text>
                              ))}
                              <text className="cls-10" textAnchor="end" x="546" y="84">
                                {headerPhone}
                              </text>
                              <text className="cls-10" textAnchor="end" x="546" y="119.5">
                                M. P.: {headerLicense}
                              </text>

                              {/* 8. Watermark Butterfly Motif in Center Background */}
                              <g id="Capa_2-4" data-name="Capa 2" className="cls-12">
                                <g id="Capa_1-2-4" data-name="Capa 1-2">
                                  <g id="Capa_2-2-3" data-name="Capa 2-2">
                                    <g id="Capa_1-2-2-3" data-name="Capa 1-2-2">
                                      <path className="cls-13" d="M69.38,700.19A12.38,12.38,0,0,0,72.26,699l2.6-1.54a43.1,43.1,0,0,0,4.8-3.26,114.3,114.3,0,0,0,9.12-7.3,150.24,150.24,0,0,0,15.56-15.75A164.67,164.67,0,0,0,127,637.28c3-5.86,5.67-11.81,8.07-18a94.29,94.29,0,0,0,3.26-9.6l1.54-4.71c.58-1.63,1.06-3.26,1.63-5,4.23-13.64,8.55-28.82,13.35-43.22s10.09-29.68,16.52-44.67a320.79,320.79,0,0,1,22.86-43.41A206.3,206.3,0,0,1,208.84,448a164.89,164.89,0,0,1,17.58-19.21,108.88,108.88,0,0,1,21.32-15.47,61,61,0,0,1,24.78-7.78,109,109,0,0,0-12.78,20,200.27,200.27,0,0,0-7.87,20.65c-4.9,13.83-8.84,28-12.68,42.36-7.68,28.81-15,57.62-24.59,87.78-1.15,3.75-2.4,7.49-3.65,11.34s-2.69,7.49-4,11.23-3,7.59-4.42,11.43-3.26,7.69-5,11.53c-1,1.92-1.83,3.94-2.79,5.86l-.77,1.44-.77,1.63c-.48,1.06-1.05,2-1.63,3.07s-2.21,3.94-3.36,6-2.4,3.94-3.65,5.86a149.58,149.58,0,0,1-17.38,21.42,126.43,126.43,0,0,1-45,30.06,100.55,100.55,0,0,1-25.93,6.15,76.1,76.1,0,0,1-13.16,0,51.18,51.18,0,0,1-6.63-1,18.34,18.34,0,0,1-3.17-.86,8.47,8.47,0,0,1-3.84-1.25"/>
                                      <path className="cls-13" d="M285.87,567.36a29,29,0,0,0,2.69-2l2.5-2,4.8-4.23c3.07-2.88,6.05-5.86,8.93-8.74,5.67-6,10.95-11.91,15.94-18.06a129.36,129.36,0,0,0,13.07-19.69,200.86,200.86,0,0,0,9.6-21.13c2.79-7.2,5.28-14.5,7.78-21.61l1.73-5.09,1.63-4.89,3.36-10.57c2.31-7.2,4.81-14.79,7.49-22.47s5.58-15.56,8.55-23.54c6-15.84,12.49-31.88,20.27-48a308.37,308.37,0,0,1,27.37-46.39,232,232,0,0,1,17.48-21.22,171.38,171.38,0,0,1,20.75-18.35,111.45,111.45,0,0,1,49-22.09,178.19,178.19,0,0,0-30.25,39.28,281.2,281.2,0,0,0-19.21,42.94c-5.38,14.79-9.61,30-14.22,45.52s-8.55,31.22-13,47.35a327.08,327.08,0,0,1-17,49.37c-1.92,4.23-4,8.45-6.44,12.68-1.25,2.21-2.5,4.32-3.84,6.43s-1.35,2.31-2,3.27L400.74,497A179,179,0,0,1,382,518.28a245.87,245.87,0,0,1-21.32,18.44c-7.4,5.57-15.08,10.86-23,15.66A116.44,116.44,0,0,1,313,564.19a92.5,92.5,0,0,1-13.06,2.88c-2.3,0-4.51.58-6.82.67a33.25,33.25,0,0,1-6.91,0"/>
                                      <path className="cls-13" d="M211.63,583.4a12.46,12.46,0,0,1,2.59,0h2.59l5,.58c3.17,0,6.43,1.25,9.6,1.92a138.29,138.29,0,0,1,17.87,5.76,146,146,0,0,1,30.44,16.62c4.52,3.26,8.84,6.72,13.06,10.37l6.05,5.67,3,2.88,3.27,3.26c8.55,8.65,17.57,18.06,27,27.28s19.21,18.34,30,27a275.8,275.8,0,0,0,33.91,24.2,180.21,180.21,0,0,0,19.21,9.61,143.71,143.71,0,0,0,20.74,7.39A90.31,90.31,0,0,0,458,729.29a52,52,0,0,0,21.61-4,91.74,91.74,0,0,1-17.38-9.6,159.79,159.79,0,0,1-14.5-12.11C438.1,695.1,430,686,421.49,676.66c-17-18.54-34-37.75-52.93-56.38-2.3-2.4-4.8-4.7-7.2-7s-4.9-4.61-7.39-6.91-5.19-4.61-7.88-6.82-5.19-4.61-7.78-6.54l-4.42-3.26-1.06-.87-1.15-.76-3-2-4.9-3.27c-1.64-1.05-3.36-2-5-2.88a117.9,117.9,0,0,0-21.42-9.6,107.43,107.43,0,0,0-45.52-4.8,87.22,87.22,0,0,0-21.9,5.57,63.78,63.78,0,0,0-9.6,5,35.33,35.33,0,0,0-4.52,3.27,20.19,20.19,0,0,0-2.11,1.92,9.29,9.29,0,0,0-1.63,2.21"/>
                                    </g>
                                  </g>
                                </g>
                              </g>

                              {/* 9. Patient Box */}
                              <path className="cls-14" d="M18.13,152.11H402.78c2.41,0,4.37,1.3,4.37,2.9v26.12c0,1.61-2.42,2.91-4.37,2.91H18.13c-2.41,0-4.37-1.61-4.37-2.91V155C13.76,153.41,16.17,152.11,18.13,152.11Z"/>
                              <text className="cls-15" transform="translate(25 170.5)">
                                PACIENTE:
                              </text>
                              <text className="cls-10" transform="translate(90 170.5)">
                                {selectedPrescription.patientName}
                              </text>

                              {/* 10. Age Box */}
                              <path className="cls-14" d="M412.88,152.52H578c1,0,1.88,1.3,1.88,2.91v26.12c0,1.6-1,2.9-1.88,2.9H412.88c-1,0-1.88-1.6-1.88-2.9V155.43C411,153.82,412,152.52,412.88,152.52Z"/>
                              <text className="cls-15" transform="translate(422 170.5)">
                                EDAD:
                              </text>
                              <text className="cls-10" transform="translate(465 170.5)">
                                {ageDisplay || '—'}
                              </text>

                              {/* 11. Diagnosis Box */}
                              <path className="cls-14" d="M20.05,190.63H573.6c3.47,0,6.29,1.3,6.29,2.9v26.12c0,1.61-3.48,2.91-6.29,2.91H20.05c-3.47,0-6.29-1.61-6.29-2.91V193.53C13.76,191.93,17.23,190.63,20.05,190.63Z"/>
                              <text className="cls-15" transform="translate(25 209)">
                                DIAGNÓSTICO:
                              </text>
                              <text className="cls-10" transform="translate(115 209)">
                                {selectedPrescription.diagnosis}
                              </text>

                              {/* 12. Dynamic Prescribed Medications List */}
                              {(() => {
                                if (parsedMeds.length === 0) {
                                  return (
                                    <text className="cls-20" transform="translate(18.13 260)" fill="#94a3b8" fontStyle="italic">
                                      No se registraron medicamentos para esta receta.
                                    </text>
                                  );
                                }

                                let curY = 252;
                                return (
                                  <g>
                                    {parsedMeds.map((med, idx) => {
                                      const line1 = formatMedicationLine1(med, idx);
                                      const line2 = formatMedicationLine2(med);
                                      const line1Parts = wrapSvgText(line1, 62);
                                      const line2Parts = wrapSvgText(line2, 68);
                                      const hasNote = med.notes && med.notes !== med.fullIndication && med.notes !== line2 && med.notes.trim() !== "";
                                      const noteParts = hasNote ? wrapSvgText(`Nota: ${med.notes}`, 68) : [];

                                      const startItemY = curY;
                                      curY += line1Parts.length * 15;
                                      const line2StartY = curY;
                                      curY += line2Parts.length * 14;
                                      const noteStartY = curY;
                                      if (hasNote) {
                                        curY += noteParts.length * 13;
                                      }
                                      curY += 10; // margin between medications

                                      return (
                                        <g key={idx}>
                                          {/* Line 1: Bold med name + dose + quantity */}
                                          {line1Parts.map((l1, lIdx) => (
                                            <text key={'l1-' + lIdx} className="cls-19" transform={`translate(18.13 ${startItemY + lIdx * 15})`}>
                                              <tspan xmlSpace="preserve">{l1}</tspan>
                                            </text>
                                          ))}

                                          {/* Line 2: Indicated administration instruction */}
                                          {line2Parts.map((l2, lIdx) => (
                                            <text key={'l2-' + lIdx} className="cls-20" transform={`translate(34 ${line2StartY + lIdx * 14})`}>
                                              {l2}
                                            </text>
                                          ))}

                                          {/* Optional Note */}
                                          {hasNote && noteParts.map((n, nIdx) => (
                                            <text key={'n-' + nIdx} className="cls-20" fill="#bf815e" fontStyle="italic" transform={`translate(34 ${noteStartY + nIdx * 13})`}>
                                              {n}
                                            </text>
                                          ))}
                                        </g>
                                      );
                                    })}

                                    {/* Non-pharmacological Advice if present */}
                                    {selectedPrescription.instructions && (
                                      <g transform={`translate(0 ${curY + 6})`}>
                                        <text className="cls-15" transform="translate(18.13 0)">
                                          INDICACIONES GENERALES Y CUIDADOS:
                                        </text>
                                        {wrapSvgText(selectedPrescription.instructions, 68).map((instLine, iIdx) => (
                                          <text key={'inst-' + iIdx} className="cls-20" transform={`translate(34 ${16 + iIdx * 14})`}>
                                            {instLine}
                                          </text>
                                        ))}
                                      </g>
                                    )}
                                  </g>
                                );
                              })()}

                              {/* 13. Signature Line and Doctor Designation */}
                              <line className="cls-17" x1="214.6" y1="677.45" x2="413.03" y2="677.45"/>
                              <text className="cls-11" transform="translate(313.8 691.62)" textAnchor="middle">
                                Dra. {selectedPrescription.doctorName.replace(/dra\./gi, '').replace(/dr\./gi, '').trim()}
                              </text>
                              <text className="cls-18" transform="translate(313.8 702.96)" textAnchor="middle">
                                Especialista en {doctorProfile?.specialty || 'Dermatología'}
                              </text>

                              {/* 14. Date Box Above Footer */}
                              <path className="cls-14" d="M20.48,722.18H574c3.48,0,6.29.84,6.29,1.87V740.8c0,1-3.47,1.87-6.29,1.87H20.48c-3.47,0-6.29-1-6.29-1.87V724.05C14.19,723,17.67,722.18,20.48,722.18Z"/>
                              <text className="cls-15" transform="translate(25 735.5)">
                                FECHA:
                              </text>
                              <text className="cls-10" transform="translate(75 735.5)">
                                {dateFormatted}
                              </text>

                              {/* 15. Footer Bar with Social Icons and Handles */}
                              {/* TikTok */}
                              <path className="cls-1" d="M21.28,769.5a7.11,7.11,0,1,0,7.11,7.1A7.11,7.11,0,0,0,21.28,769.5Zm3.68,7a3.46,3.46,0,0,1-2.09-.77v.2c0,1,0,2-.08,2.94a2.49,2.49,0,0,1-2,2.31l-.16,0a2.61,2.61,0,0,1-3-2.12v0a2.58,2.58,0,0,1,2.18-2.92h.85v1.36a4.21,4.21,0,0,0-.71,0,1.23,1.23,0,0,0-.93,1.33,1.26,1.26,0,0,0,2.48.07,1.4,1.4,0,0,0,0-.29l.16-5.46V773H23a2.16,2.16,0,0,0,.51,1.48,2.11,2.11,0,0,0,1.46.66Z"/>
                              <text className="cls-16" transform="translate(30.7 779.53)">
                                {doctorProfile?.tiktok || '@dra.karoltalavera'}
                              </text>

                              {/* Facebook */}
                              <path className="cls-1" d="M233.45,783.7v-5.11h1.38l.32-2h-2.08l0,0c0-.49,0-1,0-1.47a1,1,0,0,1,1.07-.92h1.32v-1.76c-.28,0-.57-.07-.86-.09a4.94,4.94,0,0,0-1.67.07,2.35,2.35,0,0,0-1.82,2.06c0,.38-.05.78-.06,1.17s0,.63,0,1h-1.6v2H231v5.12l-.65-.13a7.11,7.11,0,0,1-3.4-2,7.19,7.19,0,0,1-.15-9.8,6.69,6.69,0,0,1,4-2.21,7.1,7.1,0,0,1,8.29,5.77,7,7,0,0,1-1.18,5.38,7.17,7.17,0,0,1-4.32,2.92Z"/>
                              <text className="cls-16" transform="translate(241.38 778.92)">
                                {doctorProfile?.facebook || 'Dra. Karol Talavera - Dermatóloga'}
                              </text>

                              {/* Instagram */}
                              <path className="cls-1" d="M517.77,769.24a7.36,7.36,0,1,1-7.38,7.28A7.36,7.36,0,0,1,517.77,769.24Zm-4.55,7.36v1.64a4.44,4.44,0,0,0,0,.63,2.35,2.35,0,0,0,1.39,2,3.15,3.15,0,0,0,1.32.27h3.59a3.07,3.07,0,0,0,1.39-.31,2.39,2.39,0,0,0,1.34-2.21c0-1.22,0-2.44,0-3.66a3.81,3.81,0,0,0-.07-.75,2.32,2.32,0,0,0-1.5-1.86,3.52,3.52,0,0,0-1.2-.2h-3.34a5.24,5.24,0,0,0-.79,0,2.33,2.33,0,0,0-2,1.54,3,3,0,0,0-.2,1.11Z"/>
                              <path className="cls-1" d="M517.76,780.25c-.64,0-1.28,0-1.91,0a1.68,1.68,0,0,1-1.55-.83,2,2,0,0,1-.25-.92c0-1.27,0-2.54,0-3.8a1.59,1.59,0,0,1,1-1.58,2.42,2.42,0,0,1,.8-.16c1.26,0,2.52,0,3.78,0a1.67,1.67,0,0,1,1.6.88,1.94,1.94,0,0,1,.21.85c0,1.27,0,2.55,0,3.82a1.64,1.64,0,0,1-1.56,1.72l-.17,0Zm0-6a2.39,2.39,0,1,0,2.39,2.39A2.38,2.38,0,0,0,517.76,774.22Zm2.4.47a.46.46,0,0,0,.48-.46.47.47,0,0,0-.47-.48.46.46,0,0,0-.47.46A.45.45,0,0,0,520.16,774.69Z"/>
                              <path className="cls-1" d="M519.31,776.6a1.55,1.55,0,1,1-1.56-1.55A1.56,1.56,0,0,1,519.31,776.6Z"/>
                              <text className="cls-16" transform="translate(528.7 778.99)">
                                {doctorProfile?.instagram || '@dermatista'}
                              </text>
                            </svg>
                          </div>
                        );
                      })()}
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
                        <div ref={modalCatalogSearchRef} className="relative w-full sm:w-64">
                          <div className="relative flex items-center">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            <input
                              type="text"
                              value={modalCatalogSearch}
                              onChange={(e) => {
                                setModalCatalogSearch(e.target.value);
                                setIsModalCatalogDropdownOpen(true);
                              }}
                              onFocus={() => setIsModalCatalogDropdownOpen(true)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (filteredModalCatalogMeds.length > 0) {
                                    handleSelectModalCatalogMed(filteredModalCatalogMeds[0]);
                                  }
                                } else if (e.key === 'Escape') {
                                  setIsModalCatalogDropdownOpen(false);
                                }
                              }}
                              placeholder="Buscar medicamento en catálogo..."
                              className="w-full pl-8 pr-7 py-1 text-xs bg-brand-linen/40 hover:bg-white focus:bg-white border border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-rose/20 focus:border-brand-rose font-medium transition placeholder:text-slate-400"
                            />
                            {modalCatalogSearch && (
                              <button
                                type="button"
                                onClick={() => {
                                  setModalCatalogSearch('');
                                  setIsModalCatalogDropdownOpen(false);
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold px-0.5 cursor-pointer"
                                title="Borrar búsqueda"
                              >
                                ×
                              </button>
                            )}
                          </div>

                          {/* Lista desplegable de medicamentos que coinciden solo con el nombre */}
                          {isModalCatalogDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-brand-border rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto py-1 divide-y divide-slate-100">
                              {filteredModalCatalogMeds.length === 0 ? (
                                <div className="px-3 py-2 text-[11px] text-slate-400 italic text-center">
                                  No se encontró ningún medicamento en el catálogo
                                </div>
                              ) : (
                                filteredModalCatalogMeds.map((m) => {
                                  const displayName = m.genericName || m.name;
                                  return (
                                    <button
                                      key={m.id}
                                      type="button"
                                      onClick={() => handleSelectModalCatalogMed(m)}
                                      className="w-full text-left px-3 py-2 hover:bg-brand-linen/60 transition cursor-pointer flex flex-col gap-0.5 group"
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <span className="text-xs font-bold text-slate-800 group-hover:text-brand-rose truncate">
                                          {displayName}
                                        </span>
                                        {m.concentration && (
                                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                                            {m.concentration}
                                          </span>
                                        )}
                                      </div>
                                      {m.commercialName && m.commercialName !== displayName && (
                                        <span className="text-[10.5px] text-slate-500 font-medium">
                                          Comercial: {m.commercialName}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          )}
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
